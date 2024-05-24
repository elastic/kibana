/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useGlobalStore } from '@Stores/useGlobalStore';
import { userEvent } from '@testing-library/user-event';
import ContinueButton from './ContinueButton';
import RoutePaths from '../../constants/routePaths';
import { BrowserRouter as Router } from 'react-router-dom';

describe('ContinueButton Tests', () => {
  beforeEach(() => {
    useGlobalStore.getState().setContinueButtonState('ecsButtonContinue', false);
    useGlobalStore.getState().setSelected(RoutePaths.ECS_MAPPING_PATH);
  });
  describe('Click', () => {
    it('Check State changes', async () => {
      useGlobalStore.getState().setSelected(RoutePaths.ECS_MAPPING_PATH);
      render(
        <Router>
          <ContinueButton continuePath={RoutePaths.INGEST_PIPELINES_PATH} isDisabled={false} />
        </Router>
      );
      const user = userEvent.setup();
      await act(async () => {
        await user.click(await screen.getByText('Continue'));
      });
      expect(useGlobalStore.getState().selected === RoutePaths.INGEST_PIPELINES_PATH).toBe(true);
    });
  });
  describe('Rendering', () => {
    it('ContinueButton Render', async () => {
      const ecsButtonContinue = useGlobalStore.getState().ecsButtonContinue;
      render(
        <Router>
          <ContinueButton
            continuePath={RoutePaths.INGEST_PIPELINES_PATH}
            isDisabled={!ecsButtonContinue}
          />
        </Router>
      );
      expect(screen.getByLabelText('continue-button')).toBeDefined();
      expect(screen.getByLabelText('continue-button')).toBeDisabled();
    });
  });
});
