#!/usr/bin/env bash
set -euo pipefail
scriptdir="$(dirname "$0")"
cd "$scriptdir"
source variables.sh
source utils/logger.sh

helpFunction()
{
   echo ""
   echo "Usage: $0 -v "7.17.0" -n my-deployment -s 01_simple_trace.ts -o '--from=now-24h --to=now' "
   echo -e "\t-v Version of the stack "
   echo -e "\t-n Deployment name"
   echo -e "\t-r Region"
   echo -e "\t-p Hardware profile"
   echo -e "\t-s Data scenario for apm-synthtrace. Available scenarios can be found https://github.com/elastic/kibana/tree/main/packages/elastic-apm-synthtrace/src/scripts/examples"
   echo -e "\t-o Options for apm-synthtrace. Supported options can be found https://github.com/elastic/kibana/tree/main/packages/elastic-apm-synthtrace#cli"
   exit 0 # Exit script after printing help
}

if ! [ -x "$(command -v ecctl)" ]; then
  show_msg "[ERROR] ecctl not found. Download it here: https://www.elastic.co/downloads/ecctl " 4
  exit 1
fi

if ! test -f "$ECCTL_CONFIG"; then
   show_msg "[ERROR] Configuration file $ECCTL_CONFIG is missing." 4
   exit 1
fi

while getopts ":v:n:r:p:s:o:" opt
do
   case "$opt" in
      v ) VERSION="$OPTARG" ;;
      n ) DEPLOYMENT_NAME="$OPTARG" ;;
      r ) REGION="$OPTARG" ;;
      p ) HARDWARE_PROFILE="$OPTARG" ;;
      s ) SCENARIO_FILE="$OPTARG" ;;
      o ) SYNTHTRACE_OPTIONS="$OPTARG" ;;
      ? ) helpFunction ;; 
   esac
done

TMPFILE=$(mktemp -t output-XXXX)
trap "rm -f $TMPFILE" EXIT

show_msg "[INFO] Creating your deployment ${DEPLOYMENT_NAME}. Please hold, it takes about 5 minutes. ⌛" 

# create deployment
`ecctl deployment create -f ./config/deployment.json --version ${VERSION} --name ${DEPLOYMENT_NAME} \
--output text \
--format "export DEPLOYMENT_ID={{.ID}} export CLOUD_ID={{(index .Resources 0).CloudID}} export ES_PASS={{(index .Resources 0).Credentials.Password}}" --track > $TMPFILE`;

$(head -n 1 $TMPFILE)

if [ -n "$DEPLOYMENT_ID" ]; then 
   show_msg "[INFO] Deployment status: Being created 👷‍♀️" 
   `ecctl deployment show $DEPLOYMENT_ID --output text --format "export ES_TARGET=https://elastic:$ES_PASS@{{(index .Resources.Elasticsearch 0).Info.Metadata.AliasedEndpoint}}:{{(index .Resources.Elasticsearch 0).Info.Metadata.Ports.HTTPS}} export KBN_TARGET=https://elastic:$ES_PASS@{{(index .Resources.Kibana 0).Info.Metadata.AliasedEndpoint}}:{{(index .Resources.Kibana 0).Info.Metadata.Ports.HTTPS}}"`;
else 
   show_msg "[ERROR] DEPLOYMENT_ID is required" 4
fi

show_msg "[SUCCESS] Deployment status: Completed ✅" 1

cd $KB_ROOT;

if [ -n "$KBN_TARGET" ] || [ -n "$ES_TARGET" ]; then 
   show_msg "[SUCCESS] Kibana target ${KBN_TARGET}" 1
   show_msg "[SUCCESS] Elasticsearch target ${ES_TARGET}" 1
   show_msg "[INFO] Start creating APM mappings" 
   node ./scripts/es_archiver load "x-pack/plugins/apm/ftr_e2e/cypress/fixtures/es_archiver/apm_mappings_only_8.0.0" --es-url=$ES_TARGET --kibana-url=$KBN_TARGET --config=./test/functional/config.js
   show_msg "[SUCCESS] Succesfully created APM mappings ✅" 1
else 
   show_msg "[ERROR] KBN_TARGET is required" 4
   show_msg "[ERROR] ES_TARGET is required" 4
   exit 1
fi

if [ -n "$ES_TARGET" ]; then 
   show_msg "[SUCCESS] Elasticsearch target ${ES_TARGET}" 1
   show_msg "[INFO] Starting to generate synthetic APM data"
   node packages/elastic-apm-synthtrace/src/scripts/run packages/elastic-apm-synthtrace/src/scripts/examples/$SCENARIO_FILE --target=$ES_TARGET $SYNTHTRACE_OPTIONS
   show_msg "[SUCCESS] Succesfully generated APM data ✅" 1
else 
   show_msg "[ERROR] ES_TARGET is required" 4
   exit 1
fi