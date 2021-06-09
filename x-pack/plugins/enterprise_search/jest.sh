#! /bin/bash

# Whether to run Jest on the entire enterprise_search plugin or a specific component/folder

TARGET="${1:-all}"
if [[ $TARGET && $TARGET != "all" ]]
then
  # If this is a file
  if [[ "$TARGET" == *".ts"* ]]; then
    PATH_WITHOUT_EXTENSION=${1%%.*}
    TARGET="${TARGET} --collectCoverageFrom='<rootDir>/x-pack/plugins/enterprise_search/${PATH_WITHOUT_EXTENSION}.{ts,tsx}'"
  # If this is a folder
  else
    TARGET=${TARGET%/} # Strip any trailing slash
    TARGET="${TARGET}/ --collectCoverageFrom='<rootDir>/x-pack/plugins/enterprise_search/${TARGET}/**/*.{ts,tsx}'"
  fi
else
  TARGET=''
fi

# Pass all remaining arguments (e.g., ...rest) from the 2nd arg onwards
# as an open-ended string. Appends onto to the end the Jest CLI command
# @see https://jestjs.io/docs/en/cli#options
ARGS="${*:2}"

yarn test:jest $TARGET $ARGS
