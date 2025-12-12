/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const pipelineMappings = `source_field,copy_action,format_action,timestamp_format,destination_field,Notes
srcip,,,,source.address,Copying srcip to source.address
srcip,,,,source.ip,Copying srcip a second time to source.ip as well
new_event.srcip,,,,source.ip,This new event type could also populate source.ip
some_timestamp_field,,parse_timestamp,,@timestamp,Convert this timestamp to UNIX_MS format
some_other_timestamp,,,,@timestamp,Convert this timestamp to default UNIX_MS
some_new_timestamp,,parse_timestamp,UNIX,destination_timestamp,Convert this timestamp to UNIX format
srcport,rename,to_integer,,source.port,
destip,,,,destination.address,
destport,,to_integer,,destination.port,
ts,copy,,,timestamp,
action,rename,lowercase,,event.action,
duration,rename,to_float,,event.duration,
user_agent,rename,,,user_agent.original,
log_level,rename,uppercase,,log.level,
eventid,rename,to_string,,event.id,IDs should be strings!
successful,,to_boolean,,,Format source field to boolean type
hostip,rename,to_array,,host.ip,
process.args,,to_array,,,Format source field to an array
`;
