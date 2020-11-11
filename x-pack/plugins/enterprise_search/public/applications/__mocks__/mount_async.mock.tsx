/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';

import { mountWithIntl } from './';

/**
 * This helper is intended for components that have async effects
 * (e.g. http fetches) on mount. It mostly adds act/update boilerplate
 * that's needed for the wrapper to play nice with Enzyme/Jest
 *
 * Example usage:
 *
 * const wrapper = mountAsync(<Component />);
 */

interface Options {
  i18n?: boolean;
}

export const mountAsync = async (
  children: React.ReactElement,
  options: Options
): Promise<ReactWrapper> => {
  let wrapper: ReactWrapper | undefined;

  // We get a lot of act() warning/errors in the terminal without this.
  // TBH, I don't fully understand why since Enzyme's mount is supposed to
  // have act() baked in - could be because of the wrapping context provider?
  await act(async () => {
    wrapper = options.i18n ? mountWithIntl(children) : mount(children);
  });
  if (wrapper) {
    wrapper.update(); // This seems to be required for the DOM to actually update

    return wrapper;
  } else {
    throw new Error('Could not mount wrapper');
  }
};
