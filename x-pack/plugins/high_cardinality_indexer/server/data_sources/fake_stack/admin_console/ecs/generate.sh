#!/bin/sh

cd ../../../../../../../ecs/
NAME=admin_console

BASE=../high-cardinality-cluster/high_cardinality_indexer/src/data_sources/fake_stack/$NAME
ECS=$BASE/ecs

python3 ./scripts/generator.py --ref v8.0.0 \
  --subset                   $ECS/fields/subset.yml \
  --out                      $ECS/ \
  --template-settings-legacy $ECS/fields/template-settings-legacy.json \
  --template-settings        $ECS/fields/template-settings.json \
  --mapping-settings         $ECS/fields/mapping-settings.json
