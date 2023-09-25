/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSelectorConditions,
  conditionCombinationInvalid,
  getRestrictedValuesForCondition,
  validateBlockRestrictions,
  selectorsIncludeConditionsForFIMOperationsUsingSlashStarStar,
} from './utils';

import { Selector, Response } from '../../common';

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
    expect(options.includes('processName')).toBeFalsy();
    expect(options.includes('processExecutable')).toBeFalsy();
    expect(options.includes('sessionLeaderInteractive')).toBeFalsy();
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
    expect(options.includes('processName')).toBeTruthy();
    expect(options.includes('processExecutable')).toBeTruthy();
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

describe('validateBlockRestrictions', () => {
  it('reports an error when some of the FIM selectors (no operation) arent using targetFilePath', () => {
    const selectors: Selector[] = [
      {
        type: 'file',
        name: 'sel1', // no operation means all operations
      },
      {
        type: 'file',
        name: 'sel2',
        operation: ['modifyFile'],
        targetFilePath: ['/**'],
      },
    ];

    const responses: Response[] = [
      {
        type: 'file',
        match: ['sel1', 'sel2'],
        actions: ['block', 'alert'],
      },
    ];

    const errors = validateBlockRestrictions(selectors, responses);

    expect(errors).toHaveLength(1);
  });

  it('reports an error when some of the FIM selectors arent using targetFilePath', () => {
    const selectors: Selector[] = [
      {
        type: 'file',
        name: 'sel1',
        operation: ['createFile'],
      },
      {
        type: 'file',
        name: 'sel2',
        operation: ['modifyFile'],
        targetFilePath: ['/**'],
      },
    ];

    const responses: Response[] = [
      {
        type: 'file',
        match: ['sel1', 'sel2'],
        actions: ['block', 'alert'],
      },
    ];

    const errors = validateBlockRestrictions(selectors, responses);

    expect(errors).toHaveLength(1);
  });

  it('reports an error when none of the FIM selectors use targetFilePath', () => {
    const selectors: Selector[] = [
      {
        type: 'file',
        name: 'sel1',
        operation: ['createFile'],
      },
      {
        type: 'file',
        name: 'sel2',
        operation: ['modifyFile'],
      },
    ];

    const responses: Response[] = [
      {
        type: 'file',
        match: ['sel1', 'sel2'],
        actions: ['block', 'alert'],
      },
    ];

    const errors = validateBlockRestrictions(selectors, responses);

    expect(errors).toHaveLength(1);
  });

  it('passes validation when all FIM selectors (response.match) use targetFilePath', () => {
    const selectors: Selector[] = [
      {
        type: 'file',
        name: 'sel1',
        operation: ['createFile'],
        targetFilePath: ['/usr/bin/**', '/etc/**'],
      },
      {
        type: 'file',
        name: 'sel2',
        operation: ['modifyFile'],
        targetFilePath: ['/usr/bin/**', '/etc/**'],
      },
    ];

    const responses: Response[] = [
      {
        type: 'file',
        match: ['sel1', 'sel2'],
        actions: ['block', 'alert'],
      },
    ];

    const errors = validateBlockRestrictions(selectors, responses);

    expect(errors).toHaveLength(0);
  });

  it('passes validation with non fim selectors mixed in', () => {
    const selectors: Selector[] = [
      {
        type: 'file',
        name: 'sel1',
        operation: ['createFile'],
        targetFilePath: ['/usr/bin/**', '/etc/**'],
      },
      {
        type: 'file',
        name: 'sel2',
        operation: ['createExecutable', 'modifyExecutable'], // this should be allowed. FIM = createFile, modifyFile, deleteFile
      },
    ];

    const responses: Response[] = [
      {
        type: 'file',
        match: ['sel1', 'sel2'],
        actions: ['block', 'alert'],
      },
    ];

    const errors = validateBlockRestrictions(selectors, responses);

    expect(errors).toHaveLength(0);
  });

  it('passes validation if at least 1 exclude uses targetFilePath', () => {
    const selectors: Selector[] = [
      {
        type: 'file',
        name: 'sel1',
        operation: ['createFile'],
      },
      {
        type: 'file',
        name: 'excludePaths',
        targetFilePath: ['/etc/**'],
      },
    ];

    const responses: Response[] = [
      {
        type: 'file',
        match: ['sel1'],
        exclude: ['excludePaths'],
        actions: ['block', 'alert'],
      },
    ];

    const errors = validateBlockRestrictions(selectors, responses);

    expect(errors).toHaveLength(0);
  });

  it('passes validation if block isnt used', () => {
    const selectors: Selector[] = [
      {
        type: 'file',
        name: 'sel1',
        operation: ['createFile'],
      },
    ];

    const responses: Response[] = [
      {
        type: 'file',
        match: ['sel1'],
        exclude: ['excludePaths'],
        actions: ['alert'],
      },
    ];

    const errors = validateBlockRestrictions(selectors, responses);

    expect(errors).toHaveLength(0);
  });

  it('passes validation if block is used, but no selectors in match', () => {
    const responses: Response[] = [
      {
        type: 'file',
        match: [],
        actions: ['alert', 'block'],
      },
    ];

    const errors = validateBlockRestrictions([], responses);

    expect(errors).toHaveLength(0);
  });
});

describe('selectorsIncludeConditionsForFIMOperationsUsingSlashStarStar', () => {
  it('returns true', () => {
    const selectors: Selector[] = [
      {
        type: 'file',
        name: 'sel1',
        operation: ['createFile'],
        targetFilePath: ['/**'],
      },
    ];

    const response: Response = {
      type: 'file',
      match: ['sel1'],
      actions: ['block', 'alert'],
    };

    const result = selectorsIncludeConditionsForFIMOperationsUsingSlashStarStar(
      selectors,
      response.match
    );

    expect(result).toBeTruthy();
  });

  it('returns false', () => {
    const selectors: Selector[] = [
      {
        type: 'file',
        name: 'sel1',
        operation: ['createFile'],
        targetFilePath: ['/usr/bin/**'],
      },
    ];

    const response: Response = {
      type: 'file',
      match: ['sel1'],
      actions: ['block', 'alert'],
    };

    const result = selectorsIncludeConditionsForFIMOperationsUsingSlashStarStar(
      selectors,
      response.match
    );

    expect(result).toBeFalsy();
  });
});
