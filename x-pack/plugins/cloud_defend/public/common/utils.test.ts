/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSelectorsAndResponsesFromYaml,
  getYamlFromSelectorsAndResponses,
  getSelectorConditions,
  conditionCombinationInvalid,
  getRestrictedValuesForCondition,
} from './utils';
import { MOCK_YAML_CONFIGURATION, MOCK_YAML_INVALID_CONFIGURATION } from '../test/mocks';

describe('getSelectorsAndResponsesFromYaml', () => {
  it('converts yaml into arrays of selectors and responses', () => {
    const { selectors, responses } = getSelectorsAndResponsesFromYaml(MOCK_YAML_CONFIGURATION);

    expect(selectors).toHaveLength(3);
    expect(responses).toHaveLength(2);
  });

  it('returns empty arrays if bad yaml', () => {
    const { selectors, responses } = getSelectorsAndResponsesFromYaml(
      MOCK_YAML_INVALID_CONFIGURATION
    );

    expect(selectors).toHaveLength(0);
    expect(responses).toHaveLength(0);
  });
});

describe('getYamlFromSelectorsAndResponses', () => {
  it('converts arrays of selectors and responses into yaml', () => {
    const { selectors, responses } = getSelectorsAndResponsesFromYaml(MOCK_YAML_CONFIGURATION);
    const yaml = getYamlFromSelectorsAndResponses(selectors, responses);
    expect(yaml).toEqual(MOCK_YAML_CONFIGURATION);
  });
});

describe('getSelectorConditions', () => {
  it('grabs file conditions for file selectors', () => {
    const options = getSelectorConditions('file');

    // check at least one common condition present
    expect(options.includes('containerImageName')).toBeTruthy();

    // check file specific conditions present
    expect(options.includes('ignoreVolumeFiles')).toBeTruthy();
    expect(options.includes('ignoreVolumeMounts')).toBeTruthy();
    expect(options.includes('targetFilePath')).toBeTruthy();

    // check that process specific conditions are not included
    expect(options.includes('processExecutable')).toBeFalsy();
    expect(options.includes('processName')).toBeFalsy();
  });

  it('grabs process conditions for process selectors', () => {
    const options = getSelectorConditions('process');

    // check at least one common condition present
    expect(options.includes('containerImageName')).toBeTruthy();

    // check file specific conditions present
    expect(options.includes('ignoreVolumeFiles')).toBeFalsy();
    expect(options.includes('ignoreVolumeMounts')).toBeFalsy();
    expect(options.includes('targetFilePath')).toBeFalsy();

    // check that process specific conditions are not included
    expect(options.includes('processExecutable')).toBeTruthy();
    expect(options.includes('processName')).toBeTruthy();
    expect(options.includes('processUserName')).toBeTruthy();
    expect(options.includes('processUserId')).toBeTruthy();
    expect(options.includes('sessionLeaderInteractive')).toBeTruthy();
  });
});

describe('conditionCombinationInvalid', () => {
  it('returns true when conditions cannot be combined', () => {
    const result = conditionCombinationInvalid(['ignoreVolumeMounts'], 'ignoreVolumeFiles');

    expect(result).toBeTruthy();
  });

  it('returns false when they can', () => {
    const result = conditionCombinationInvalid(['containerImageName'], 'ignoreVolumeFiles');

    expect(result).toBeFalsy();
  });
});

describe('getRestrictedValuesForCondition', () => {
  it('works', () => {
    let values = getRestrictedValuesForCondition('file', 'operation');
    expect(values).toEqual([
      'createExecutable',
      'modifyExecutable',
      'createFile',
      'modifyFile',
      'deleteFile',
    ]);

    values = getRestrictedValuesForCondition('process', 'operation');
    expect(values).toEqual(['fork', 'exec']);
  });
});
