#!/bin/sh

set -e

# Regenerates the index.ts that contains all of the rules that are read in from json

PREPACKAGED_RULES_INDEX=../rules/prepackaged_rules/index.ts

echo "/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Auto generated file from scripts/regen_prepackage_rules_index.sh
// Do not hand edit. Run that script to regenerate package information instead
" > ${PREPACKAGED_RULES_INDEX}

RULE_NUMBER=1
for f in ../rules/prepackaged_rules/*.json ; do
  echo "import rule${RULE_NUMBER} from './$(basename -- "$f")';" >> ${PREPACKAGED_RULES_INDEX}
  RULE_NUMBER=$[$RULE_NUMBER +1]
done

echo "export const rawRules = [" >> ${PREPACKAGED_RULES_INDEX}

RULE_NUMBER=1
for f in ../rules/prepackaged_rules/*.json ; do
  echo "  rule${RULE_NUMBER}," >> ${PREPACKAGED_RULES_INDEX}
  RULE_NUMBER=$[$RULE_NUMBER +1]
done

echo "];" >> ${PREPACKAGED_RULES_INDEX}