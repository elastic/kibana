/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import expect from 'expect.js';
import { deprecations as deprecationsModule } from '../deprecations';
import sinon from 'sinon';

describe('monitoring plugin deprecations', function () {
  let transformDeprecations;

  before(function () {
    const noopDeprecation = () => noop;
    const deprecations = deprecationsModule({ rename: noopDeprecation });
    transformDeprecations = (settings, log = noop) => {
      deprecations.forEach(deprecation => deprecation(settings, log));
    };
  });

  it('verificationMode is set to full when elasticsearch.ssl.verify is true', function () {
    const settings = {
      elasticsearch: {
        ssl: {
          verify: true
        }
      }
    };

    transformDeprecations(settings);
    expect(settings.elasticsearch.ssl.verificationMode).to.eql('full');
  });

  it(`sets verificationMode to none when verify is false`, function () {
    const settings = {
      elasticsearch: {
        ssl: {
          verify: false
        }
      }
    };

    transformDeprecations(settings);
    expect(settings.elasticsearch.ssl.verificationMode).to.be('none');
    expect(settings.elasticsearch.ssl.verify).to.be(undefined);
  });

  it('should log when deprecating verify from false', function () {
    const settings = {
      elasticsearch: {
        ssl: {
          verify: false
        }
      }
    };

    const log = sinon.spy();
    transformDeprecations(settings, log);
    expect(log.calledOnce).to.be(true);
  });

  it('sets verificationMode to full when verify is true', function () {
    const settings = {
      elasticsearch: {
        ssl: {
          verify: true
        }
      }
    };

    transformDeprecations(settings);
    expect(settings.elasticsearch.ssl.verificationMode).to.be('full');
    expect(settings.elasticsearch.ssl.verify).to.be(undefined);
  });

  it('should log when deprecating verify from true', function () {
    const settings = {
      elasticsearch: {
        ssl: {
          verify: true
        }
      }
    };

    const log = sinon.spy();
    transformDeprecations(settings, log);
    expect(log.calledOnce).to.be(true);
  });

  it(`shouldn't set verificationMode when verify isn't present`, function () {
    const settings = {
      elasticsearch: {
        ssl: {}
      }
    };

    transformDeprecations(settings);
    expect(settings.elasticsearch.ssl.verificationMode).to.be(undefined);
  });

  it(`shouldn't log when verify isn't present`, function () {
    const settings = {
      elasticsearch: {
        ssl: {}
      }
    };

    const log = sinon.spy();
    transformDeprecations(settings, log);
    expect(log.called).to.be(false);
  });

  it('should log when deprecating node_resolver', function () {
    const settings = {
      node_resolver: 'uuid'
    };

    const log = sinon.spy();
    transformDeprecations(settings, log);
    expect(log.calledOnce).to.be(true);
  });

  it(`shouldn't log when node_resolver isn't present`, function () {
    const settings = { };

    const log = sinon.spy();
    transformDeprecations(settings, log);
    expect(log.called).to.be(false);
  });
});
