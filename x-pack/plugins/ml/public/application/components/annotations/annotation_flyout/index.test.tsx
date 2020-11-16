/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import useObservable from 'react-use/lib/useObservable';
import mockAnnotations from '../annotations_table/__mocks__/mock_annotations.json';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { Annotation } from '../../../../../common/types/annotations';
import { AnnotationUpdatesService } from '../../../services/annotations_service';

import { AnnotationFlyout } from './index';
import { MlAnnotationUpdatesContext } from '../../../contexts/ml/use_ml_annotation_updates';

jest.mock('../../../util/dependency_cache', () => ({
  getToastNotifications: () => ({ addSuccess: jest.fn(), addDanger: jest.fn() }),
}));

const annotationUpdatesService = new AnnotationUpdatesService();

const MlAnnotationUpdatesContextProvider = ({ children }: { children: React.ReactElement }) => {
  return (
    <MlAnnotationUpdatesContext.Provider value={{ annotationUpdatesService }}>
      <IntlProvider>{children}</IntlProvider>
    </MlAnnotationUpdatesContext.Provider>
  );
};

// useObservable wraps the observable in a new component
const ObservableComponent = (props: any) => {
  const annotationProp = useObservable(annotationUpdatesService.update$());
  if (annotationProp === undefined) {
    return null;
  }
  return (
    <AnnotationFlyout
      annotation={annotationProp}
      {...props}
      annotationUpdatesService={annotationUpdatesService}
    />
  );
};

describe('AnnotationFlyout', () => {
  test('Update button is disabled with empty annotation', async () => {
    const annotation = mockAnnotations[1] as Annotation;

    annotationUpdatesService.setValue(annotation);

    render(
      <MlAnnotationUpdatesContextProvider>
        <ObservableComponent />
      </MlAnnotationUpdatesContextProvider>
    );
    const updateBtn = screen.getByText('Update').closest('button');
    expect(updateBtn).toBeDisabled();
  });

  test('Error displayed and update button displayed if annotation text is longer than max chars', async () => {
    const annotation = mockAnnotations[2] as Annotation;
    annotationUpdatesService.setValue(annotation);

    // useObservable wraps the observable in a new component

    render(
      <MlAnnotationUpdatesContextProvider>
        <ObservableComponent />
      </MlAnnotationUpdatesContextProvider>
    );
    const updateBtn = screen.getByText('Update').closest('button');
    expect(updateBtn).toBeDisabled();
    await waitFor(() => {
      const errorText = screen.queryByText(/characters above maximum length/);
      expect(errorText).not.toBe(undefined);
    });
  });

  test('Flyout disappears when annotation is updated', async () => {
    const annotation = mockAnnotations[0] as Annotation;

    annotationUpdatesService.setValue(annotation);

    const { getByTestId } = render(
      <MlAnnotationUpdatesContextProvider>
        <ObservableComponent />
      </MlAnnotationUpdatesContextProvider>
    );
    const updateBtn = getByTestId('annotationFlyoutUpdateButton');
    expect(updateBtn).not.toBeDisabled();
    expect(screen.queryByTestId('mlAnnotationFlyout')).toBeInTheDocument();

    await fireEvent.click(updateBtn);
    expect(screen.queryByTestId('mlAnnotationFlyout')).not.toBeInTheDocument();
    screen.debug();
  });
});
