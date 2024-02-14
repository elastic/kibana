#!/bin/bash

while [[ $# -gt 0 ]]; do
    case "$1" in
        --type)
            type=$2
            shift 2
            ;;
        --id)
            id_value=$2
            shift 2
            ;;
        --criticality_level)
            criticality_level=$2
            shift 2
            ;;
        --kibana_url)
            kibana_url=$2
            shift 2
            ;;
        *)
            echo "Invalid argument: $1"
            exit 1
            ;;
    esac
done

if [ -z "$type" ] || [ -z "$id_value" ] || [ -z "$criticality_level" ] || [ -z "$kibana_url" ]; then
    echo "Usage: $0 --type <type> --id <id_value> --criticality_level <criticality_level> --kibana_url <kibana_url>"
    exit 1
fi

case "$criticality_level" in
    extreme_impact|high_impact|medium_impact|low_impact)
        ;;
    *)
        echo "Invalid criticality_level. Must be one of extreme_impact, high_impact, medium_impact, low_impact."
        exit 1
        ;;
esac

if [ "$type" == "host" ]; then
    id_field="host.name"
elif [ "$type" == "user" ]; then
    id_field="user.name"
else
    echo "Invalid type. Must be 'host' or 'user'."
    exit 1
fi

json_data=$(cat <<EOF
{
    "id_field": "$id_field",
    "id_value": "$id_value",
    "criticality_level": "$criticality_level"
}
EOF
)

curl -X POST -H "Content-Type: application/json" -H "kbn-xsrf: hello" -H "elastic-api-version: 1" -d "$json_data" "$kibana_url/internal/asset_criticality"

echo ""
echo "created criticality record for $type $id_value with criticality level $criticality_level"