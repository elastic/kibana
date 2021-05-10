#!/bin/sh
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#
# Creates three different exception lists and value lists, and associates as
# below to test referential integrity functionality.
#
# NOTE: Endpoint lists don't support value lists, and are not tested here
#
# EL: Exception list
# ELI Exception list Item
# VL: Value list
#
#
#      EL1        EL2 (Agnostic)   EL3
#       |          |                |
#      ELI1       ELI2             ELI3
#       |\        /|                |
#       | \      / |                |
#       |  \    /  |                |
#       |   \  /   |                |
#       |    \/    |                |
#       |    /\    |                |
#       |   /  \   |                |
#       |  /    \  |                |
#       | /      \ |                |
#       |/        \|                |
#      VL1        VL2              VL3        VL4
#    ips.txt  ip_range.txt       text.txt   hosts.txt

./hard_reset.sh && \
# Create value lists
./import_list_items_by_filename.sh ip ./lists/files/ips.txt && \
./import_list_items_by_filename.sh ip_range ./lists/files/ip_range.txt && \
./import_list_items_by_filename.sh keyword ./lists/files/text.txt && \
./import_list_items_by_filename.sh keyword ./lists/files/hosts.txt && \
# Create exception lists 1, 2 (agnostic), 3
./post_exception_list.sh ./exception_lists/new/references/exception_list_detection_1.json && \
./post_exception_list.sh ./exception_lists/new/references/exception_list_detection_2_agnostic.json && \
./post_exception_list.sh ./exception_lists/new/references/exception_list_detection_3.json && \
# Create exception list items with value lists
./post_exception_list_item.sh ./exception_lists/new/references/exception_list_item_1_multi_value_list.json && \
./post_exception_list_item.sh ./exception_lists/new/references/exception_list_item_2_multi_value_list.json && \
./post_exception_list_item.sh ./exception_lists/new/references/exception_list_item_3_single_value_list.json && \
# Create exception list items (non value lists, to ensure they're not deleted on cleanup)
./post_exception_list_item.sh ./exception_lists/new/references/exception_list_item_1_non_value_list.json
