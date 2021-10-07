#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Uses a default of 100 if no argument is specified
NUMBER=${1:-100}

# Example: ./post_x_rules.sh
# Example: ./post_x_rules.sh 200
for i in $(seq 1 $NUMBER);
do {
  curl -s -k \
  -H 'Connection: keep-alive' \
  -H 'sec-ch-ua: "Google Chrome";v="93", " Not;A Brand";v="99", "Chromium";v="93"' \
  -H 'Content-Type: application/json' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36' \
  -H 'kbn-version: 8.0.0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'Accept: */*' \
  -H 'Origin: http://localhost:5601' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Dest: empty' \
  -H $'Referer: http://localhost:5601/app/security/rules/create?sourcerer=(default:\u0021(%27filebeat-*%27))&timerange=(global:(linkTo:\u0021(timeline),timerange:(from:%272021-10-07T04:00:00.000Z%27,fromStr:now%2Fd,kind:relative,to:%272021-10-08T03:59:59.999Z%27,toStr:now%2Fd)),timeline:(linkTo:\u0021(global),timerange:(from:%272021-10-07T04:00:00.000Z%27,fromStr:now%2Fd,kind:relative,to:%272021-10-08T03:59:59.999Z%27,toStr:now%2Fd)))' \
  -H 'Accept-Language: en-US,en;q=0.9' \
  -H 'Cookie: sid=Fe26.2**963eeb710f44237944d4ff2e95b0307c2d7c310f88ef3ffa7280bfd20b60e320*9Bny6RxqhdRgjge5UsUMGg*TqXWPeONnc6OFrrdgbBi38Pcj2Jt-kNSsuAk6EJw9H8ifbQV5htjOILfuSeUIb11N_XpWblxva2jhS0dLj1StztP6CrDqDjfDKSmEreqKga0Y1H8Ubzmp6hxSwEomk360z5sXolINgpLlQ3DDMTJhAfAU7JD-UW88WKgAhIxMocPGEHXzq1e7LtSmeEA-uV36P1w2yyHgwITnN2kau79OMhYfxtxh6UU4YrB79Zy5pESMnunitvn_KHItM18zB0M**c3655255cbbb152c21f6f5675c3cb8c209547286193cfcdc8f5c7209f6dd058b*zTCgOU7y8o6r06LHPISHVpQvZPynIGtaUwRqXApc0mM' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X POST ${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules \
  --data-raw '{"type":"query","index":["test-*"],"filters":[],"language":"kuery","query":"file.hash.md5 : * ","author":[],"false_positives":[],"references":[],"risk_score":21,"risk_score_mapping":[],"severity":"low","severity_mapping":[],"threat":[],"name":"asdf","description":"asdf","tags":[],"license":"","interval":"1m","from":"now-600000060s","to":"now","meta":{"from":"10000000m","kibana_siem_app_url":"http://localhost:5601/app/security"},"actions":[],"enabled":true,"throttle":"no_actions"}' \

  | jq .;
} &
done

wait

curl 'http://localhost:5601/api/detection_engine/rules/preview' \
  -H 'Connection: keep-alive' \
  -H 'sec-ch-ua: "Google Chrome";v="93", " Not;A Brand";v="99", "Chromium";v="93"' \
  -H 'Content-Type: application/json' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36' \
  -H 'kbn-version: 8.0.0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'Accept: */*' \
  -H 'Origin: http://localhost:5601' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Dest: empty' \
  -H $'Referer: http://localhost:5601/app/security/rules/create?sourcerer=(default:\u0021(%27filebeat-*%27))&timerange=(global:(linkTo:\u0021(timeline),timerange:(from:%272021-10-07T04:00:00.000Z%27,fromStr:now%2Fd,kind:relative,to:%272021-10-08T03:59:59.999Z%27,toStr:now%2Fd)),timeline:(linkTo:\u0021(global),timerange:(from:%272021-10-07T04:00:00.000Z%27,fromStr:now%2Fd,kind:relative,to:%272021-10-08T03:59:59.999Z%27,toStr:now%2Fd)))' \
  -H 'Accept-Language: en-US,en;q=0.9' \
  -H 'Cookie: sid=Fe26.2**963eeb710f44237944d4ff2e95b0307c2d7c310f88ef3ffa7280bfd20b60e320*9Bny6RxqhdRgjge5UsUMGg*TqXWPeONnc6OFrrdgbBi38Pcj2Jt-kNSsuAk6EJw9H8ifbQV5htjOILfuSeUIb11N_XpWblxva2jhS0dLj1StztP6CrDqDjfDKSmEreqKga0Y1H8Ubzmp6hxSwEomk360z5sXolINgpLlQ3DDMTJhAfAU7JD-UW88WKgAhIxMocPGEHXzq1e7LtSmeEA-uV36P1w2yyHgwITnN2kau79OMhYfxtxh6UU4YrB79Zy5pESMnunitvn_KHItM18zB0M**c3655255cbbb152c21f6f5675c3cb8c209547286193cfcdc8f5c7209f6dd058b*zTCgOU7y8o6r06LHPISHVpQvZPynIGtaUwRqXApc0mM' \
  --data-raw '{"type":"query","index":["test-*"],"filters":[],"language":"kuery","query":"* : * ","author":[],"false_positives":[],"references":[],"risk_score":21,"risk_score_mapping":[],"severity":"low","severity_mapping":[],"threat":[],"name":"asdf","description":"asdf","tags":[],"license":"","interval":"1m","from":"now-7d","to":"now","meta":{"from":"now-7d","kibana_siem_app_url":"http://localhost:5601/app/security"},"actions":[],"enabled":true,"throttle":"no_actions","invocationCount":4}' \
  --compressed
