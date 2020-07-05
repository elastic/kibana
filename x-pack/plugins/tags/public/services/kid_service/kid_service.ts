/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react-hooks/rules-of-hooks */

import React, { createElement as h } from 'react';
import { parseKID, KID } from '../../../common/kid';
import { KidCard } from '../../components/kid_card';

export interface KidInfo {
  name?: string;
  description?: string;
  euiIcon?: string;
  type?: string;
  editURL?: string;
  viewURL?: string;
}

export type KidInfoProvider = (kid: KID) => Promise<KidInfo>;

export interface CardProps {
  kid: string;
}

export class KidService {
  private readonly infoProviders = new Map<string, KidInfoProvider>();

  public readonly registerInfoProvider = (service: string, provider: KidInfoProvider) => {
    this.infoProviders.set(service, provider);
  };

  public readonly getInfo = async (kid: string): Promise<KidInfo> => {
    const parsed = parseKID(kid);
    const { service } = parsed;
    const provider = this.infoProviders.get(service);
    if (!provider)
      throw new Error(`KID info provider for service [service = ${service}] not found.`);
    return await provider(parsed);
  };

  public readonly Card: React.FC<CardProps> = ({ kid }) => {
    const [info, setInfo] = React.useState<KidInfo | null>(null);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      this.getInfo(kid).then(setInfo, setError);
    }, [kid]);

    if (error) {
      return h('div', {}, `Could not resolve KID: ${kid}`);
    }

    if (!info) return null;

    return h(KidCard, { info }, 'kid...');
  };
}
