#!/bin/sh
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#
# Creates three different exception lists and exception list items
#
# EL: Exception list
#
#      EL1        EL2 (Agnostic)   EL3       
#       |         /|                
#       |        / |                
#       |       /  |                
#       |      /   |               
#       |     /    |                
#       |    /     |             
#       |   /      |             
#       |  /       |             
#       | /        |            
#       |/         |             
#      RULE1     RULE2        

./hard_reset.sh && \
# Create rules 1, 2
./post_rule.sh ./rules/queries/references/query_with_single_exception_list.json && \
./post_rule.sh ./rules/queries/references/query_with_multiple_exception_lists.json && \
