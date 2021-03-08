#!/bin/sh

set -e
./check_env_variables.sh

# Regenerates the index.ts that contains all of the timelines that are read in from json
PREPACKAGED_TIMELINES_INDEX=../rules/prepackaged_timelines/index.ndjson

# Clear existing content
echo "" > ${PREPACKAGED_TIMELINES_INDEX}

echo "/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Auto generated file from scripts/regen_prepackage_timelines_index.sh
// Do not hand edit. Run that script to regenerate package information instead
" > ${PREPACKAGED_TIMELINES_INDEX}

for f in ../rules/prepackaged_timelines/*.json ; do
  echo "converting $f"
  sed ':a;N;$!ba;s/\n/ /g' $f >> ${PREPACKAGED_TIMELINES_INDEX}
done
