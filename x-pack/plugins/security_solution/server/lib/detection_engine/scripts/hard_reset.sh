#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Clean up and remove all Detection Engine's saved objects and related data
./delete_all_actions.sh
./delete_all_alerts.sh
./delete_all_alert_tasks.sh
./delete_all_rule_execution_data.sh

# Re-create the signal index
./delete_signal_index.sh
./post_signal_index.sh
