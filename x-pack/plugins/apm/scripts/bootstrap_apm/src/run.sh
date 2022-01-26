#!/usr/bin/env bash
set -u
scriptdir="$(dirname "$0")"
cd "$scriptdir"
source variables.sh
source utils/logger.sh

if ! [ -x "$(command -v ecctl)" ]; then
  echo -e "${RED}ERROR: ${NC}ecctl not found.${NC}"
  exit 1
fi

helpFunction()
{
   echo ""
   echo "Usage: $0 -v "7.17.0" -n my-deployment -r europe-west2 -p gcp-hot-warm"
   echo -e "\t-v Version of the stack "
   echo -e "\t-n Deployment name"
   echo -e "\t-r Region"
   echo -e "\t-p Hardware profile"
   exit 1 # Exit script after printing help
}

while getopts ":v:n:r:p:" opt
do
   case "$opt" in
      v ) VERSION="$OPTARG" ;;
      n ) DEPLOYMENT_NAME="$OPTARG" ;;
      r ) REGION="$OPTARG" ;;
      p ) HARDWARE_PROFILE="$OPTARG" ;;
      ? ) helpFunction ;; 
   esac
done

show_msg "[INFO] Creating your deployment ${DEPLOYMENT_NAME}. Please hold, it takes about 5 minutes. ⌛" 

# create deployment
`ecctl deployment create -f ./config/deployment.json --version ${VERSION} --name ${DEPLOYMENT_NAME} \
--format "export DEPLOYMENT_ID={{.ID}} export CLOUD_ID={{(index .Resources 0).CloudID}} export ES_PASS={{(index .Resources 0).Credentials.Password}}" --track > output.txt`;

$(head -n 1 output.txt)

show_msg "[INFO] Deployment status: Being created 👷‍♀️" 

if [ -n "$DEPLOYMENT_ID" ]; then 
   `ecctl deployment show $DEPLOYMENT_ID --format "export ES_TARGET=https://elastic:$ES_PASS@{{(index .Resources.Elasticsearch 0).Info.Metadata.AliasedEndpoint}}:{{(index .Resources.Elasticsearch 0).Info.Metadata.Ports.HTTPS}} export KBN_TARGET=https://elastic:$ES_PASS@{{(index .Resources.Kibana 0).Info.Metadata.AliasedEndpoint}}:{{(index .Resources.Kibana 0).Info.Metadata.Ports.HTTPS}}"`;
else 
   show_msg "[ERROR] DEPLOYMENT_ID is required" 4
fi

show_msg "[SUCCESS] Deployment status: Completed ✅" 1

cd $KB_ROOT;

if [ -n "$KBN_TARGET"] || [ -n "$ES_TARGET" ]; then 
   show_msg "[SUCCESS] Kibana target ${KBN_TARGET}" 1
   show_msg "[SUCCESS] Elasticsearch target ${ES_TARGET}" 1
   show_msg "[INFO] Start creating APM mappings" 
   node ./scripts/es_archiver load "x-pack/plugins/apm/ftr_e2e/cypress/fixtures/es_archiver/apm_mappings_only_8.0.0" --es-url=$ES_TARGET --kibana-url=$KBN_TARGET --config=./test/functional/config.js
   show_msg "[SUCCESS] Succesfully created APM mappings ✅" 1
else 
   show_msg "[ERROR] KBN_TARGET is required" 4
   show_msg "[ERROR] ES_TARGET is required" 4
fi

if [ -n "$ES_TARGET" ]; then 
   show_msg "[SUCCESS] Elasticsearch target ${ES_TARGET}" 1
   show_msg "[INFO] Start generate synthetic APM data"
   node packages/elastic-apm-synthtrace/src/scripts/run packages/elastic-apm-synthtrace/src/scripts/examples/01_simple_trace.ts --target=$ES_TARGET
   show_msg "[SUCCESS] Succesfully APM data ✅"
else 
   show_msg "[ERROR] ES_TARGET is required" 4
fi

