/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCombinedRefinePrompt } from '.';
import { mockAttackDiscoveries } from '../../../../../../evaluation/__mocks__/mock_attack_discoveries';
import { getContinuePrompt } from '../../../helpers/get_continue_prompt';

describe('getCombinedRefinePrompt', () => {
  it('returns the base query when combinedRefinements is empty', () => {
    const result = getCombinedRefinePrompt({
      attackDiscoveryPrompt: 'Initial query',
      combinedRefinements: '',
      refinePrompt: 'Refine prompt',
      unrefinedResults: [...mockAttackDiscoveries],
    });

    expect(result).toEqual(`Initial query

Refine prompt

"""
${JSON.stringify(mockAttackDiscoveries, null, 2)}
"""

`);
  });

  it('returns the combined prompt when combinedRefinements is not empty', () => {
    const result = getCombinedRefinePrompt({
      attackDiscoveryPrompt: 'Initial query',
      combinedRefinements: 'Combined refinements',
      refinePrompt: 'Refine prompt',
      unrefinedResults: [...mockAttackDiscoveries],
    });

    expect(result).toEqual(`Initial query

Refine prompt

"""
${JSON.stringify(mockAttackDiscoveries, null, 2)}
"""



${getContinuePrompt()}

"""
Combined refinements
"""

`);
  });

  it('handles null unrefinedResults', () => {
    const result = getCombinedRefinePrompt({
      attackDiscoveryPrompt: 'Initial query',
      combinedRefinements: '',
      refinePrompt: 'Refine prompt',
      unrefinedResults: null,
    });

    expect(result).toEqual(`Initial query

Refine prompt

"""
null
"""

`);
  });
});
