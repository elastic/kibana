/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

// this will run before any code that's inside a describe block
// so we can use it to set up whatever we need for our browser tests
before(() => {
  // configure enzume
  enzyme.configure({ adapter: new Adapter() });
});
