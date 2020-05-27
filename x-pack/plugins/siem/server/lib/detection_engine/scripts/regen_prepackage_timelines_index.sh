#!/bin/sh

set -e

# Regenerates the index.ts that contains all of the timelines that are read in from json
PREPACKAGED_TIMELINES_INDEX=../rules/prepackaged_timelines/index.ndjson

# Clear existing file
echo "" > ${PREPACKAGED_TIMELINES_INDEX}

for f in ../rules/prepackaged_timelines/*.json ; do
  sed ':a;N;$!ba;s/\n/ /g' $f >> ${PREPACKAGED_TIMELINES_INDEX}
done
