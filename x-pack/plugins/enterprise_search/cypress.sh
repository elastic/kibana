#! /bin/bash

# Use either `cypress run` or `cypress open` - defaults to run
MODE="${1:-run}"

# Choose which product folder to use, e.g. `yarn cypress open as`
PRODUCT="${2}"
# Provide helpful shorthands
if [ "$PRODUCT" == "as" ]; then PRODUCT='app_search'; fi
if [ "$PRODUCT" == "ws" ]; then PRODUCT='workplace_search'; fi
if [ "$PRODUCT" == "overview" ]; then PRODUCT='enterprise_search'; fi

# Pass all remaining arguments (e.g., ...rest) from the 3rd arg onwards
# as an open-ended string. Appends onto to the end the Cypress command
# @see https://docs.cypress.io/guides/guides/command-line.html#Options
ARGS="${*:3}"

../../../node_modules/.bin/cypress "$MODE" --project "public/applications/$PRODUCT" --browser chrome $ARGS
