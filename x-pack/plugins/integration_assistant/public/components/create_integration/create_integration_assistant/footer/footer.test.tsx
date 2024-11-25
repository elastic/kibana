/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../../../mocks/test_provider';
import { Footer } from './footer';
import { ActionsProvider } from '../state';
import { mockActions } from '../mocks/state';
import { ExperimentalFeaturesService } from '../../../../services';

const mockNavigate = jest.fn();
jest.mock('../../../../common/hooks/use_navigate', () => ({
  ...jest.requireActual('../../../../common/hooks/use_navigate'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../../services');
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedExperimentalFeaturesService.get.mockReturnValue({
      generateCel: false,
    } as never);
  });

  describe('when rendered for the most common case', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(<Footer isNextStepEnabled />, {
        wrapper,
      });
    });
    it('should render footer buttons component', () => {
      expect(result.queryByTestId('buttonsFooter')).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      expect(result.queryByTestId('buttonsFooter-cancelButton')).toBeInTheDocument();
    });

    it('should render back button', () => {
      expect(result.queryByTestId('buttonsFooter-backButton')).toBeInTheDocument();
    });

    it('should render next button', () => {
      expect(result.queryByTestId('buttonsFooter-nextButton')).toBeInTheDocument();
    });
  });

  /*  describe('when step is 2', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(
        <Footer currentStep={2} isGenerating={false} hasCelInput={false} isNextStepEnabled />,
        {
          wrapper,
        }
      );
    });

    describe('when next button is clicked', () => {
      beforeEach(() => {
        act(() => {
          result.getByTestId('buttonsFooter-nextButton').click();
        });
      });

      it('should set step 3', () => {
        expect(mockActions.setStep).toHaveBeenCalledWith(3);
      });

      it('should report telemetry', () => {
        expect(mockReportEvent).toHaveBeenCalledWith(
          TelemetryEventType.IntegrationAssistantStepComplete,
          {
            sessionId: expect.any(String),
            step: 2,
            stepName: 'Integration Step',
            durationMs: expect.any(Number),
            sessionElapsedTime: expect.any(Number),
          }
        );
      });
    });

    describe('when back button is clicked', () => {
      beforeEach(() => {
        act(() => {
          result.getByTestId('buttonsFooter-backButton').click();
        });
      });

      it('should set step 1', () => {
        expect(mockActions.setStep).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when step is 3', () => {
    describe('when it is not generating', () => {
      let result: RenderResult;
      beforeEach(() => {
        result = render(
          <Footer currentStep={3} isGenerating={false} hasCelInput={false} isNextStepEnabled />,
          {
            wrapper,
          }
        );
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should set step 4', () => {
          expect(mockActions.setIsGenerating).toHaveBeenCalledWith(true);
        });

        it('should report telemetry', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.IntegrationAssistantStepComplete,
            {
              sessionId: expect.any(String),
              step: 3,
              stepName: 'DataStream Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });
      });

      describe('when back button is clicked', () => {
        beforeEach(() => {
          act(() => {
            result.getByTestId('buttonsFooter-backButton').click();
          });
        });

        it('should set step 2', () => {
          expect(mockActions.setStep).toHaveBeenCalledWith(2);
        });
      });
    });

    describe('when it is generating', () => {
      let result: RenderResult;
      beforeEach(() => {
        result = render(
          <Footer currentStep={3} isGenerating={true} hasCelInput={false} isNextStepEnabled />,
          {
            wrapper,
          }
        );
      });

      it('should render the loader', () => {
        expect(result.queryByTestId('generatingLoader')).toBeInTheDocument();
      });
    });
  });

  describe('when step is 4', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(
        <Footer currentStep={4} isGenerating={false} hasCelInput={false} isNextStepEnabled />,
        {
          wrapper,
        }
      );
    });

    describe('when next button is clicked', () => {
      beforeEach(() => {
        act(() => {
          result.getByTestId('buttonsFooter-nextButton').click();
        });
      });

      it('should set step 5', () => {
        expect(mockActions.setStep).toHaveBeenCalledWith(5);
      });

      it('should report telemetry', () => {
        expect(mockReportEvent).toHaveBeenCalledWith(
          TelemetryEventType.IntegrationAssistantStepComplete,
          {
            sessionId: expect.any(String),
            step: 4,
            stepName: 'Review Step',
            durationMs: expect.any(Number),
            sessionElapsedTime: expect.any(Number),
          }
        );
      });
    });

    describe('when back button is clicked', () => {
      beforeEach(() => {
        act(() => {
          result.getByTestId('buttonsFooter-backButton').click();
        });
      });

      it('should set step 3', () => {
        expect(mockActions.setStep).toHaveBeenCalledWith(3);
      });
    });
  });

  describe('when next step is disabled', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(<Footer currentStep={1} isGenerating={false} hasCelInput={false} />, {
        wrapper,
      });
    });
    it('should render next button disabled', () => {
      expect(result.queryByTestId('buttonsFooter-nextButton')).toBeDisabled();
    });
  });*/
});
