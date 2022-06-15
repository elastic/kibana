/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid/v5';

function isUUID(val: string) {
  return (
    typeof val === 'string' &&
    val.match(/[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/)
  );
}

export function idToUuid(id: string) {
  if (isUUID(id)) {
    return id;
  }

  // UUID v5 need a namespace (uuid.DNS), changing this params will result in loosing the ability to generate predicable uuid
  return uuid(id, uuid.DNS);
}
