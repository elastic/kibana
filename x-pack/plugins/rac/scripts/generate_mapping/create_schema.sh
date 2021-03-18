#!/bin/sh
#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#


scriptsDir="$(pwd)"
echo "$scriptsDir"
cd ../../../../../ecs || exit
build/ve/bin/python scripts/generator.py --ref v1.8.0 \
  --subset            "$scriptsDir"/fields/subset.yml \
  --include           "$scriptsDir"/fields/custom/ \
  --out               "$scriptsDir"/../generated/ \
  --template-settings "$scriptsDir"/fields/template-settings.json \
  --mapping-settings  "$scriptsDir"/fields/mapping-settings.json
