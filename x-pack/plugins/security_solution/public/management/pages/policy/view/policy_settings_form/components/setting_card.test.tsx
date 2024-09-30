/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import React from 'react';
import type { SettingCardProps } from './setting_card';
import { SettingCard } from './setting_card';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { exactMatchText } from '../mocks';

describe('Policy form SettingCard component', () => {
  let formProps: SettingCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      type: 'Malware',
      supportedOss: [OperatingSystem.WINDOWS, OperatingSystem.MAC, OperatingSystem.LINUX],
      osRestriction: undefined,
      rightCorner: undefined,
      dataTestSubj: 'test',
      children: <div data-test-subj="test-bodyContent">{'body content here'}</div>,
    };

    render = () => {
      renderResult = mockedContext.render(<SettingCard {...formProps} />);
      return renderResult;
    };
  });

  it('should render with expected content', () => {
    const { getByTestId } = render();

    expect(getByTestId('test-osValues')).toHaveTextContent(exactMatchText('Windows, Mac, Linux'));
    expect(getByTestId('test-type')).toHaveTextContent(exactMatchText('Malware'));
    expect(getByTestId('test-rightCornerContainer')).toBeEmptyDOMElement();
    expect(getByTestId('test-bodyContent'));
  });

  it('should show OS restriction info', () => {
    formProps.osRestriction = <>{'some content here'}</>;
    render();

    expect(renderResult.getByTestId('test-osRestriction')).toHaveTextContent(
      exactMatchText('RestrictionsInfo')
    );
  });

  it('should show right corner content', () => {
    formProps.rightCorner = <div data-test-subj="test-rightContent">{'foo'}</div>;
    render();

    expect(renderResult.getByTestId('test-rightCornerContainer')).not.toBeEmptyDOMElement();
    expect(renderResult.getByTestId('test-rightContent'));
  });

  it('should show right corner content in viewport width greater than 1600px', () => {
    // Set the viewport above xxl breakpoint
    window.innerWidth = 1601;
    window.dispatchEvent(new Event('resize'));

    formProps.rightCorner = <div data-test-subj="test-rightContent">{'foo'}</div>;
    render();

    const rightContent = renderResult.getByTestId('test-rightContent');
    expect(rightContent).toBeVisible();
  });
});
