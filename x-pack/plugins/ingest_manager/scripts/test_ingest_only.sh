#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

printf "\n\nSHOULD get agent configs\n"
source $DIR/get_agent_configs.sh

printf "\n\nSHOULD create agent config\n"
source $DIR/create_agent_configs.sh

printf "\n\nSHOULD have new agent config\n"
source $DIR/get_agent_configs.sh

printf "\n\nSHOULD get datasources\n"
source $DIR/get_datasources.sh

printf "\n\nSHOULD create datasource\n"
source $DIR/create_datasources.sh

printf "\n\nSHOULD 404 from EPM package api\n"
source $DIR/get_single_package.sh
