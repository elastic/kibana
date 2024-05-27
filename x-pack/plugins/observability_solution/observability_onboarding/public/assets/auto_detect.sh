#!/bin/bash

log_file_list_string=""
known_integrations_list_string=""
selected_known_integrations_array=()
selected_known_integrations_tsv_string=""
unknown_log_file_path_list_string=""
unknown_log_file_pattern_list_string=""
selected_unknown_log_file_pattern_array=()
selected_unknown_log_file_pattern_tsv_string=""
custom_log_file_path_list_tsv_string=""

read_log_file_list() {
  local exclude_patterns=("^\/Users\/.+?\/Library\/Application Support")

  local list=$(lsof -Fn | grep "log$" | awk '/^n/ {print substr($0, 2)}' | sort | uniq)
  local filtered_list=""

  # Filtering by the exclude patterns
  while IFS= read -r line; do
      if ! grep -qE "$(IFS="|"; echo "${exclude_patterns[*]}")" <<< "$line"; then
          filtered_list+="$line\n"
      fi
  done <<< "$list"

  log_file_list_string=$filtered_list
}

detect_known_integrations() {
  while IFS= read -r log_file_path; do
    local integration=""

    if [[ $log_file_path =~ ^(/private)?/var/log/nginx ]]; then
      integration="nginx"
    fi
    if [[ $log_file_path =~ ^(/private)?/var/log/(apache2|httpd) ]]; then
      integration="apache"
    fi
    if [[ $log_file_path =~ ^(/private)?/var/lib/docker/containers ]]; then
      integration="docker"
    fi
    if [[ $log_file_path =~ ^(/private)?/var/log/(syslog|auth|system|messages|secure) ]]; then
      integration="system"
    fi

    if [ -n "$integration" ]; then
      known_integrations_list_string+="$integration\n"
    else
      unknown_log_file_path_list_string+="$log_file_path\n"
    fi
  done <<< "$(echo -e $log_file_list_string)"

  known_integrations_list_string=$(echo -e "$known_integrations_list_string" | sort -u)
}

known_integration_title() {
  local integration=$1
  case $integration in
    "nginx")
      echo "Nginx Logs"
      ;;
    "apache")
      echo "Apache Logs"
      ;;
    "docker")
      echo "Docker Container Logs"
      ;;
    "system")
      echo "System Logs"
      ;;
    *)
      echo "Unknown"
      ;;
  esac
}

build_unknown_log_file_patterns() {
  while IFS= read -r log_file_path; do
    unknown_log_file_pattern_list_string+="$(dirname "$log_file_path")/*.log\n"
  done <<< "$(echo -e $unknown_log_file_path_list_string)"

  unknown_log_file_pattern_list_string=$(echo -e "$unknown_log_file_pattern_list_string" | sort -u)
}

function select_list() {
  local known_integrations_options=()
  local unknown_logs_options=()

  while IFS= read -r line; do
    if [[ -z "$line" ]]; then
      continue
    fi
    known_integrations_options+=("$line")
  done <<< "$known_integrations_list_string"

  while IFS= read -r line; do
    if [[ -z "$line" ]]; then
      continue
    fi
    unknown_logs_options+=("$line")
  done <<< "$unknown_log_file_pattern_list_string"

  local options=("${known_integrations_options[@]}" "${unknown_logs_options[@]}")

  for i in "${!options[@]}"; do
    if [[ "$i" -lt "${#known_integrations_options[@]}" ]]; then
      printf "\e[32m%s)\e[0m %s\n" "${i}" "$(known_integration_title "${options[$i]}")"
    else
      printf "\e[32m%s)\e[0m %s\n" "${i}" "${options[$i]}"
    fi
  done

  echo -e "\nList logs to exclude (e.g. 1, 2, 3):"
  read exclude_index_list_string

  IFS=', ' read -r -a exclude_index_list_array <<< "$exclude_index_list_string"

  for index in "${!options[@]}"; do
      local is_excluded=0
      for excluded_index in "${exclude_index_list_array[@]}"; do
        if [[ "$index" -eq "$excluded_index" ]]; then
            is_excluded=1
        fi
      done

      if [[ $is_excluded -eq 0 ]]; then
        if [[ "$index" -lt "${#known_integrations_options[@]}" ]]; then
          selected_known_integrations_array+=("${options[index]}")
        else
          selected_unknown_log_file_pattern_array+=("${options[index]}")
        fi
      fi
  done
}

echo "Looking for log files..."
read_log_file_list
detect_known_integrations
build_unknown_log_file_patterns

echo -e "\nWe found these logs on your system, see which ones you'd like to ingest:"
select_list

echo -e "\nYou can list any custom log paths that we have not detected (e.g. /var/log/myapp/*.log, /home/j/myapp/*.log)"
read custom_log_file_path_list_string

IFS=', ' read -r -a custom_log_file_path_list_array <<< "$custom_log_file_path_list_string"

echo -e "\nThese logs will be ingested:"
for item in "${selected_known_integrations_array[@]}" "${selected_unknown_log_file_pattern_array[@]}" "${custom_log_file_path_list_array[@]}"; do
  printf "• %s\n" "$item"
done

echo -e "\n"
read -p "Looks good? [Y/n] (default: Y): " confirmation_reply

if [[ ! "$confirmation_reply" =~ ^[Yy]$ ]]; then
  echo -e "You can run the script again to select different logs."
  exit 1
fi

# Converting to TSV strings
IFS=$'\t'
selected_known_integrations_tsv_string="${selected_known_integrations_array[*]}"
selected_unknown_log_file_pattern_tsv_string="${selected_unknown_log_file_pattern_array[*]}"
custom_log_file_path_list_tsv_string="${custom_log_file_path_list_array[*]}"
unset IFS
