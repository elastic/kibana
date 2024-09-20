#!/bin/bash

# Define the source file name
source_file="event_log_update_mappings.test.ts"

# Loop from 001 to 65
for i in $(seq -w 1 65); do
  # Construct the new file name with suffix
  destination_file="${source_file%.*}_$i.test.${source_file##*.}"
  # Copy the file
  cp "$source_file" "$destination_file"
done
