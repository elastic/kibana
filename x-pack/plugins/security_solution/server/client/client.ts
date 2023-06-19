/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../config';
import {
  DEFAULT_ALERTS_INDEX,
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_PREVIEW_INDEX,
} from '../../common/constants';

export class AppClient {
  private readonly alertsIndex: string;
  private readonly signalsIndex: string;
  private readonly spaceId: string;
  private readonly previewIndex: string;
  private readonly sourcererDataViewId: string;
  private readonly kibanaVersion: string;
  private readonly kibanaBranch: string;

  constructor(spaceId: string, config: ConfigType, kibanaVersion: string, kibanaBranch: string) {
    const configuredSignalsIndex = config.signalsIndex;

    this.alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
    this.signalsIndex = `${configuredSignalsIndex}-${spaceId}`;
    this.previewIndex = `${DEFAULT_PREVIEW_INDEX}-${spaceId}`;
    this.sourcererDataViewId = `${DEFAULT_DATA_VIEW_ID}-${spaceId}`;
    this.spaceId = spaceId;
    this.kibanaVersion = kibanaVersion;
    this.kibanaBranch = kibanaBranch;
  }

  public getAlertsIndex = (): string => this.alertsIndex;
  public getSignalsIndex = (): string => this.signalsIndex;
  public getPreviewIndex = (): string => this.previewIndex;
  public getSourcererDataViewId = (): string => this.sourcererDataViewId;
  public getSpaceId = (): string => this.spaceId;
  public getKibanaVersion = (): string => this.kibanaVersion;
  public getKibanaBranch = (): string => this.kibanaBranch;
}
