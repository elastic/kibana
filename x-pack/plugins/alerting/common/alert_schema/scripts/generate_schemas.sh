#!/usr/bin/env bash

# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.

echo --- Getting ECS template

# Pin to a specific commit
ECS_VERSION=8.6
git clone --depth 1 -b $ECS_VERSION https://github.com/elastic/ecs.git ./ecs

cp ./ecs/generated/elasticsearch/legacy/template.json ../component_templates/assets/ecs_legacy_template.json

rm -rf ./ecs

echo --- Generating ECS field map from template

node generate_ecs_fieldmap.js

echo --- Generating Alert and ECS schemas from template

npx -q ts-node create_schema_from_mapping.js
