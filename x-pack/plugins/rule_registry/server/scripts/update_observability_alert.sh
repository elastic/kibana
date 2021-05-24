set -e

IDS=${1}
STATUS=${2}

echo $IDS
echo "'"$STATUS"'"

cd ./hunter && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ../observer && sh ./post_detections_role.sh && sh ./post_detections_user.sh
cd ..

# Example: ./update_observability_alert.sh [\"my-alert-id\",\"another-alert-id\"] <closed | open>
curl -s -k \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -u observer:changeme \
 -X POST ${KIBANA_URL}${SPACE_URL}/update-alert \
 -d "{\"ids\": $IDS, \"status\":\"$STATUS\"}" | jq .
