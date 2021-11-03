/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigType } from '../config';
import { DEFAULT_PREVIEW_INDEX } from '../../common/constants';

export class AppClient {
  private readonly signalsIndex: string;
  private readonly spaceId: string;
  private readonly previewIndex: string;

  constructor(_spaceId: string, private config: ConfigType) {
    const configuredSignalsIndex = this.config.signalsIndex;

    this.signalsIndex = `${configuredSignalsIndex}-${_spaceId}`;
    this.previewIndex = `${DEFAULT_PREVIEW_INDEX}-${_spaceId}`;
    this.spaceId = _spaceId;
  }

  public getSignalsIndex = (): string => this.signalsIndex;
  public getPreviewIndex = (): string => this.previewIndex;
  public getSpaceId = (): string => this.spaceId;
}
