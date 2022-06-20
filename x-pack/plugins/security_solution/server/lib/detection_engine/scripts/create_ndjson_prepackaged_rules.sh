#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

i=0;
for f in ../rules/prepackaged_rules/*.json ; do
  ((i++));
  echo "converting $f"
  cat ../rules/prepackaged_rules/windows_msxsl_network.json | tr -d '\n' | tr -d ' ' >> pre_packaged_rules.ndjson
  echo "" >> pre_packaged_rules.ndjson
done
echo "{\"exported_count\":$i,\"missing_rules\":[],\"missing_rules_count\":0}" >> pre_packaged_rules.ndjson

