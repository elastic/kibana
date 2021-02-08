/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMSFileSource } from './ems_file_source';

jest.mock('../../layers/vector_layer/vector_layer', () => {});

function makeEMSFileSource(tooltipProperties: string[]) {
  const emsFileSource = new EMSFileSource({ tooltipProperties });
  emsFileSource.getEmsFieldLabel = async (name: string) => {
    return name === 'iso2' ? 'ISO 2 CODE' : name;
  };
  return emsFileSource;
}

describe('EMS file source', () => {
  describe('getTooltipProperties', () => {
    it('should create tooltip-properties with human readable label', async () => {
      const mockEMSFileSource = makeEMSFileSource(['iso2']);
      const out = await mockEMSFileSource.getTooltipProperties({
        iso2: 'US',
      });

      expect(out.length).toEqual(1);
      expect(out[0].getPropertyKey()).toEqual('iso2');
      expect(out[0].getPropertyName()).toEqual('ISO 2 CODE');
      expect(out[0].getHtmlDisplayValue()).toEqual('US');
    });

    it('should order tooltip-properties', async () => {
      const tooltipProperties = ['iso3', 'iso2', 'name'];
      const mockEMSFileSource = makeEMSFileSource(tooltipProperties);
      const out = await mockEMSFileSource.getTooltipProperties({
        name: 'United States',
        iso3: 'USA',
        iso2: 'US',
      });

      expect(out.length).toEqual(3);
      expect(out[0].getPropertyKey()).toEqual(tooltipProperties[0]);
      expect(out[1].getPropertyKey()).toEqual(tooltipProperties[1]);
      expect(out[2].getPropertyKey()).toEqual(tooltipProperties[2]);
    });
  });
});
