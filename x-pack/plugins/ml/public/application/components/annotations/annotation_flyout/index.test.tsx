/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import mockAnnotations from '../annotations_table/__mocks__/mock_annotations.json';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { Annotation } from '../../../../../common/types/annotations';
import { AnnotationUpdatesService } from '../../../services/annotations_service';

import { AnnotationFlyout } from './index';
import { MlAnnotationUpdatesContext } from '../../../contexts/ml/ml_annotation_updates_context';

jest.mock('../../../util/dependency_cache', () => ({
  getToastNotifications: () => ({ addSuccess: jest.fn(), addDanger: jest.fn() }),
}));

const MlAnnotationUpdatesContextProvider = ({
  annotationUpdatesService,
  children,
}: {
  annotationUpdatesService: AnnotationUpdatesService;
  children: React.ReactElement;
}) => {
  return (
    <MlAnnotationUpdatesContext.Provider value={annotationUpdatesService}>
      <IntlProvider>{children}</IntlProvider>
    </MlAnnotationUpdatesContext.Provider>
  );
};

const ObservableComponent = (props: any) => {
  const { annotationUpdatesService } = props;
  const annotationProp = useObservable(annotationUpdatesService!.isAnnotationInitialized$());
  if (annotationProp === undefined) {
    return null;
  }
  return (
    <AnnotationFlyout
      annotation={annotationProp}
      annotationUpdatesService={annotationUpdatesService}
      {...props}
    />
  );
};

describe('AnnotationFlyout', () => {
  let annotationUpdatesService: AnnotationUpdatesService | null = null;
  beforeEach(() => {
    annotationUpdatesService = new AnnotationUpdatesService();
  });

  test('Update button is disabled with empty annotation', async () => {
    const annotation = mockAnnotations[1] as Annotation;

    annotationUpdatesService!.setValue(annotation);

    const { getByTestId } = render(
      <MlAnnotationUpdatesContextProvider annotationUpdatesService={annotationUpdatesService!}>
        <ObservableComponent annotationUpdatesService={annotationUpdatesService!} />
      </MlAnnotationUpdatesContextProvider>
    );
    const updateBtn = getByTestId('annotationFlyoutUpdateOrCreateButton');
    expect(updateBtn).toBeDisabled();
  });

  test('Error displayed and update button displayed if annotation text is longer than max chars', async () => {
    const annotation = mockAnnotations[2] as Annotation;
    annotationUpdatesService!.setValue(annotation);

    const { getByTestId } = render(
      <MlAnnotationUpdatesContextProvider annotationUpdatesService={annotationUpdatesService!}>
        <ObservableComponent annotationUpdatesService={annotationUpdatesService!} />
      </MlAnnotationUpdatesContextProvider>
    );
    const updateBtn = getByTestId('annotationFlyoutUpdateOrCreateButton');
    expect(updateBtn).toBeDisabled();
    await waitFor(() => {
      const errorText = screen.queryByText(/characters above maximum length/);
      expect(errorText).not.toBe(undefined);
    });
  });

  test('Flyout disappears when annotation is updated', async () => {
    const annotation = mockAnnotations[0] as Annotation;

    annotationUpdatesService!.setValue(annotation);

    const { getByTestId } = render(
      <MlAnnotationUpdatesContextProvider annotationUpdatesService={annotationUpdatesService!}>
        <ObservableComponent annotationUpdatesService={annotationUpdatesService!} />
      </MlAnnotationUpdatesContextProvider>
    );
    const updateBtn = getByTestId('annotationFlyoutUpdateOrCreateButton');
    expect(updateBtn).not.toBeDisabled();
    expect(screen.queryByTestId('mlAnnotationFlyout')).toBeInTheDocument();

    await fireEvent.click(updateBtn);
    expect(screen.queryByTestId('mlAnnotationFlyout')).not.toBeInTheDocument();
  });
});
