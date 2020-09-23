/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GeoJsonProperties } from 'geojson';
import { IESTermSource } from '../sources/es_term_source';
import { IJoin } from './join';
import { JoinDescriptor } from '../../../common/descriptor_types';
import { ISource } from '../sources/source';
import { ITooltipProperty } from '../tooltips/tooltip_property';
import { IField } from '../fields/field';

export class InnerJoin implements IJoin {
  constructor(joinDescriptor: JoinDescriptor, leftSource: ISource);

  destroy: () => void;

  getRightJoinSource(): IESTermSource;

  toDescriptor(): JoinDescriptor;

  getLeftField: () => IField;

  getSourceDataRequestId: () => string;

  getSourceMetaDataRequestId(): string;

  getSourceFormattersDataRequestId(): string;

  getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;

  hasCompleteConfig: () => boolean;
}
