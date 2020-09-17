#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

# Simple example of a set of commands to load online lists into elastic as well as how to query them

set -e
./check_env_variables.sh

# What to cap lists at during downloads
export TOTAL_LINES_PER_FILE=100

# Download a set of lists to the $TMPDIR folder
echo "Downloading lists..."
cd ${TMPDIR}
echo "Downloading mdl.txt"
curl -s -L https://panwdbl.appspot.com/lists/mdl.txt | head -${TOTAL_LINES_PER_FILE} > mdl.txt
echo "Downloading cybercrime.txt"
curl -s -L https://cybercrime-tracker.net/all.php | head -${TOTAL_LINES_PER_FILE} > cybercrime.txt
echo "Downloading online-valid.csv"
curl -s -L https://data.phishtank.com/data/online-valid.csv | head -${TOTAL_LINES_PER_FILE} > online-valid.csv
echo "Downloading dynamic_dns.txt"
curl -s -L http://dns-bh.sagadc.org/dynamic_dns.txt | head -${TOTAL_LINES_PER_FILE} > dynamic_dns.txt
echo "Downloading ipblocklist.csv"
curl -s -L https://feodotracker.abuse.ch/downloads/ipblocklist.csv | head -${TOTAL_LINES_PER_FILE} > ipblocklist.csv
echo "Done downloading lists"
cd - > /dev/null

# Import the lists in various formats from $TMPDIR folder
echo "Importing mdl.txt as a ip_range format"
./import_list_items_by_filename.sh ip_range ${TMPDIR}/mdl.txt

echo "Importing mdl.txt as a regular ip format using a custom serializer into the list ip_custom_format_list"
./post_list.sh ./lists/new/lists/ip_custom_format.json
./import_list_items.sh ip_custom_format_list ${TMPDIR}/mdl.txt

echo "Importing mdl.txt as a keyword format using a custom serializer into the list keyword_custom_format_list"
./post_list.sh ./lists/new/lists/keyword_custom_format.json
./import_list_items.sh keyword_custom_format_list ${TMPDIR}/mdl.txt

echo "Calling /_find to iterate ip_range"
./find_list_items.sh mdl.txt

echo "Calling /_find to iterate ip_custom_format_list"
./find_list_items.sh ip_custom_format_list

echo "Calling /_find to iterate keyword_custom_format_list"
./find_list_items.sh keyword_custom_format_list

echo "Exporting to the terminal each format"
./export_list_items.sh mdl.txt
./export_list_items.sh ip_custom_format_list
./export_list_items.sh keyword_custom_format_list

echo "Querying against an IP that might or might not be in each list"
./get_list_item_by_value.sh mdl.txt 46.254.17.30
./get_list_item_by_value.sh ip_custom_format_list 46.254.17.0/16
./get_list_item_by_value.sh keyword_custom_format_list 46.254.17.30

echo "Importing cybercrime.txt as a ip_custom_format_list format"
./import_list_items.sh ip_custom_format_list ${TMPDIR}/cybercrime.txt

echo "Importing cybercrime.txt as a keyword_custom_format_list format"
./import_list_items.sh keyword_custom_format_list ${TMPDIR}/cybercrime.txt

echo "Importing cybercrime.txt as a ip_custom_format_list format"
./import_list_items.sh ip_custom_format_list ${TMPDIR}/ipblocklist.csv

echo "Importing cybercrime.txt as a keyword_custom_format_list format"
./import_list_items.sh keyword_custom_format_list ${TMPDIR}/ipblocklist.csv


