#!/bin/bash

# Define the source file name
source_file="task_manager_capacity_based_claiming.test.ts"

# Loop from 001 to 100
for i in $(seq -w 1 40); do
  # Construct the new file name with suffix
  destination_file="${source_file%.*}_$i.test.${source_file##*.}"
  # Copy the file
  cp "$source_file" "$destination_file"
done
