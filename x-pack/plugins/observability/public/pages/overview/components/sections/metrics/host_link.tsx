/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { StringOrNull } from '../../../../..';

interface Props {
  name: StringOrNull;
  id: StringOrNull;
  timerange: { from: number; to: number };
}

export function HostLink({ name, id, timerange }: Props) {
  const link = `../../app/metrics/link-to/host-detail/${id}?from=${timerange.from}&to=${timerange.to}`;
  return (
    <>
      <a href={link}>{name}</a>
    </>
  );
}
