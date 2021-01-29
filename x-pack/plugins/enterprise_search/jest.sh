#! /bin/bash

# Whether to run Jest on the entire enterprise_search plugin or a specific component/folder
FOLDER="${1:-all}"
if [[ $FOLDER && $FOLDER != "all" ]]
then
  FOLDER=${FOLDER%/} # Strip any trailing slash
  FOLDER="${FOLDER}/ --collectCoverageFrom='<rootDir>/x-pack/plugins/enterprise_search/${FOLDER}/**/*.{ts,tsx}'"
else
  FOLDER=''
fi

# Pass all remaining arguments (e.g., ...rest) from the 2nd arg onwards
# as an open-ended string. Appends onto to the end the Jest CLI command
# @see https://jestjs.io/docs/en/cli#options
ARGS="${*:2}"

yarn test:jest $FOLDER $ARGS
