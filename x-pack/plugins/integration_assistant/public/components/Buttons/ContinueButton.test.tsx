import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useGlobalStore } from '@Stores/useGlobalStore';
import { userEvent } from '@testing-library/user-event';
import ContinueButton from '@Components/Buttons/ContinueButton';
import RoutePaths from '@Constants/routePaths';
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
        </Router>,
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
          <ContinueButton continuePath={RoutePaths.INGEST_PIPELINES_PATH} isDisabled={!ecsButtonContinue} />
        </Router>,
      );
      expect(screen.getByLabelText('continue-button')).toBeDefined();
      expect(screen.getByLabelText('continue-button')).toBeDisabled();
    });
  });
});
