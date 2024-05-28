#!/bin/bash

known_integrations_list_string=""
selected_known_integrations_array=()
selected_known_integrations_tsv_string=""
unknown_log_file_path_list_string=""
unknown_log_file_pattern_list_string=""
selected_unknown_log_file_pattern_array=()
excluded_options_string=""
selected_unknown_log_file_pattern_tsv_string=""
custom_log_file_path_list_tsv_string=""
known_integrations_api_body_string=""
custom_integrations_api_body_string=""

read_open_log_file_list() {
  local exclude_patterns=(
    "^\/Users\/.+?\/Library\/Application Support"
    "^\/Users\/.+?\/Library\/Caches",
    # Excluding all patterns that correspond to known integrations
    # that we are detecting separately
    "^\/var\/log\/nginx",
    "^\/var\/log\/apache2",
    "^\/var\/log\/httpd",
    "^\/var\/lib\/docker\/containers",
    "^\/var\/log\/syslog",
    "^\/var\/log\/auth.log",
    "^\/var\/log\/system.log",
    "^\/var\/log\/messages",
    "^\/var\/log\/secure",
  )

  local list=$(lsof -Fn | grep "\.log$" | awk '/^n/ {print substr($0, 2)}' | sort | uniq)

  # Filtering by the exclude patterns
  while IFS= read -r line; do
      if ! grep -qE "$(IFS="|"; echo "${exclude_patterns[*]}")" <<< "$line"; then
          unknown_log_file_path_list_string+="$line\n"
      fi
  done <<< "$list"
}

detect_known_integrations() {
    if [[ -d "/var/log/nginx" ]]; then
      known_integrations_list_string+="nginx"$'\n'
    fi

    if [ -d "/var/log/apache2" ] || [ -d "/var/log/httpd" ] ; then
      known_integrations_list_string+="apache"$'\n'
    fi

    if [ -d "/var/lib/docker/containers" ]; then
      known_integrations_list_string+="docker"$'\n'
    fi

    if [ -f "/var/log/syslog" ] ||
       [ -f "/var/log/auth.log" ] ||
       [ -f "/var/log/system.log" ] ||
       [ -f "/var/log/messages" ] ||
       [ -f "/var/log/secure" ]; then
      known_integrations_list_string+="system"$'\n'
    fi
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
      printf "\e[32m%s)\e[0m %s\n" "$((i + 1))" "$(known_integration_title "${options[$i]}")"
    else
      printf "\e[32m%s)\e[0m %s\n" "$((i + 1))" "${options[$i]}"
    fi
  done

  echo -e "\n"
  read -p "Ingest all of them? [Y/n] (default: Yes): " confirmation_reply
  confirmation_reply="${confirmation_reply:-Y}"

  if [[ ! "$confirmation_reply" =~ ^[Yy]$ ]]; then
    echo -e "\nExclude logs by listing their index numbers (e.g. 1, 2, 3):"
    read exclude_index_list_string

    IFS=', ' read -r -a exclude_index_list_array <<< "$exclude_index_list_string"

    for index in "${!options[@]}"; do
      local is_excluded=0
      for excluded_index in "${exclude_index_list_array[@]}"; do
        if [[ "$index" -eq "$((excluded_index - 1))" ]]; then
            is_excluded=1
        fi
      done

      if [[ $is_excluded -eq 0 ]]; then
        if [[ "$index" -lt "${#known_integrations_options[@]}" ]]; then
          selected_known_integrations_array+=("${options[index]}")
        else
          selected_unknown_log_file_pattern_array+=("${options[index]}")
        fi
      else
        excluded_options_string+="$((index + 1))) ${options[index]}\n"
      fi
    done
  else
    selected_known_integrations_array=("${known_integrations_options[@]}")
    selected_unknown_log_file_pattern_array=("${unknown_logs_options[@]}")
  fi
}

generate_custom_integration_name() {
    local path_pattern="$1"
    local dir_path
    local name_parts=()
    local name

    dir_path=$(dirname "$path_pattern")
    IFS='/' read -r -a dir_array <<< "$dir_path"

    # Get the last up to 4 parts of the path
    for (( i=${#dir_array[@]}-1, count=0; i>=0 && count<4; i--, count++ )); do
        name_parts=("${dir_array[$i]}" "${name_parts[@]}")
    done

    # Join the parts into a single string with underscores
    name=$(printf "%s_" "${name_parts[@]}")
    name="${name#_}"  # Remove leading underscore
    name="${name%_}"  # Remove trailing underscore

    # Replace special characters with underscores
    name="${name// /_}"
    name="${name//-/_}"
    name="${name//./_}"

    echo "$name"
}

build_known_integrations_api_body_string() {
  for item in "${selected_known_integrations_array[@]}"; do
    known_integrations_api_body_string+="$item\tregistry\n"
  done
}

build_custom_integrations_api_body_string() {
  for item in "${selected_unknown_log_file_pattern_array[@]}" "${custom_log_file_path_list_array[@]}"; do
    local integration_name=$(generate_custom_integration_name "$item")

    custom_integrations_api_body_string+="$integration_name\tcustom\t$item\n"
  done
}

echo "Looking for log files..."
detect_known_integrations
read_open_log_file_list
build_unknown_log_file_patterns

echo -e "\nWe found these logs on your system:"
select_list

if [[ -n "$excluded_options_string" ]]; then
  echo -e "\nThese logs will not be ingested:"
  echo -e "$excluded_options_string"
fi

echo -e "\nList any custom logs that we have not detected (e.g. /var/log/myapp/*.log, /home/j/myapp/*.log). Press Enter to skip."
read custom_log_file_path_list_string

IFS=', ' read -r -a custom_log_file_path_list_array <<< "$custom_log_file_path_list_string"

echo -e "\nThese logs will be ingested:"
for item in "${selected_known_integrations_array[@]}"; do
  printf "• %s\n" "$(known_integration_title "${item}")"
done
for item in "${selected_unknown_log_file_pattern_array[@]}" "${custom_log_file_path_list_array[@]}"; do
  printf "• %s\n" "$item"
done

echo -e "\n"
read -p "Confirm selection [Y/n] (default: Yes): " confirmation_reply
confirmation_reply="${confirmation_reply:-Y}"

if [[ ! "$confirmation_reply" =~ ^[Yy]$ ]]; then
  echo -e "You can run the script again to select different logs."
  exit 1
fi

build_known_integrations_api_body_string
build_custom_integrations_api_body_string
