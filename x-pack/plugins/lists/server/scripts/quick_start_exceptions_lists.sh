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
# Create exception lists 1, 2 (agnostic), 3
./post_exception_list.sh ./exception_lists/new/references/exception_list_detection_1.json && \
./post_exception_list.sh ./exception_lists/new/references/exception_list_detection_2_agnostic.json && \
./post_exception_list.sh ./exception_lists/new/references/exception_list_detection_3.json && \
# Create exception list items
./post_exception_list_item.sh ./exception_lists/new/references/exception_list_item_1_non_value_list.json && \
./post_exception_list_item.sh ./exception_lists/new/references/exception_list_item_2_non_value_list.json && \
./post_exception_list_item.sh ./exception_lists/new/references/exception_list_item_3_non_value_list.json
