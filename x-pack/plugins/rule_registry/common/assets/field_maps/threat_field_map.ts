/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const threatFieldMap = {
  'threat.indicator.as.number': {
    type: 'long',
    array: false,
    required: false,
  },
  'threat.indicator.as.organization.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.confidence': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.description': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.email.address': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.accessed': {
    type: 'date',
    array: false,
    required: false,
  },
  'threat.indicator.file.attributes': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'threat.indicator.file.code_signature.digest_algorithm': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.code_signature.exists': {
    type: 'boolean',
    array: false,
    required: false,
  },
  'threat.indicator.file.code_signature.signing_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.code_signature.status': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.code_signature.subject_name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.code_signature.team_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.code_signature.timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  'threat.indicator.file.code_signature.trusted': {
    type: 'boolean',
    array: false,
    required: false,
  },
  'threat.indicator.file.code_signature.valid': {
    type: 'boolean',
    array: false,
    required: false,
  },
  'threat.indicator.file.created': {
    type: 'date',
    array: false,
    required: false,
  },
  'threat.indicator.file.ctime': {
    type: 'date',
    array: false,
    required: false,
  },
  'threat.indicator.file.device': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.directory': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.drive_letter': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.extension': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.fork_name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.gid': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.group': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.hash.md5': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.hash.sha1': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.hash.sha256': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.hash.sha512': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.hash.ssdeep': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.inode': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.mime_type': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.mode': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.mtime': {
    type: 'date',
    array: false,
    required: false,
  },
  'threat.indicator.file.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.owner': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.path': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.size': {
    type: 'long',
    array: false,
    required: false,
  },
  'threat.indicator.file.target_path': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.type': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.file.uid': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.first_seen': {
    type: 'date',
    array: false,
    required: false,
  },
  'threat.indicator.ip': {
    type: 'ip',
    array: false,
    required: false,
  },
  'threat.indicator.last_seen': {
    type: 'date',
    array: false,
    required: false,
  },
  'threat.indicator.marking.tlp': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.modified_at': {
    type: 'date',
    array: false,
    required: false,
  },
  'threat.indicator.port': {
    type: 'long',
    array: false,
    required: false,
  },
  'threat.indicator.provider': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.reference': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.registry.data.bytes': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.registry.data.strings': {
    type: 'wildcard',
    array: true,
    required: false,
  },
  'threat.indicator.registry.data.type': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.registry.hive': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.registry.key': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.registry.path': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.registry.value': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.scanner_stats': {
    type: 'long',
    array: false,
    required: false,
  },
  'threat.indicator.sightings': {
    type: 'long',
    array: false,
    required: false,
  },
  'threat.indicator.type': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.url.domain': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.url.extension': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.url.fragment': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.url.full': {
    type: 'wildcard',
    array: false,
    required: false,
  },
  'threat.indicator.url.original': {
    type: 'wildcard',
    array: false,
    required: false,
  },
  'threat.indicator.url.password': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.url.path': {
    type: 'wildcard',
    array: false,
    required: false,
  },
  'threat.indicator.url.port': {
    type: 'long',
    array: false,
    required: false,
  },
  'threat.indicator.url.query': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.url.registered_domain': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.url.scheme': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.url.subdomain': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.url.top_level_domain': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.indicator.url.username': {
    type: 'keyword',
    array: false,
    required: false,
  },
};
