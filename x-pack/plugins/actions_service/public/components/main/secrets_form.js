/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export class SecretsForm extends React.Component {

  constructor() {
    super();
    this.state = {
      key: '',
      value: '',
    };

    this.keyChangeHandler = this.onKeyChange.bind(this);
    this.valueChangeHandler = this.onValueChange.bind(this);
    this.submitHandler = this.sendClick.bind(this);
  }

  onKeyChange(event) {
    this.setState({ key: event.target.value });
  }

  onValueChange(event) {
    this.setState({ value: event.target.value });
  }

  sendClick(event) {
    const payload = {
      key: this.state.key,
      value: this.state.value,
    };
    this.props.httpClient
      .post('../api/secrets-tester/store', payload)
      .then(({ data }) => {
        console.log(data);
      });

    event.preventDefault();
  }

  render() {
    const { key, value } = this.state;
    return (
      <form action="../api/secrets-tester/store" method="POST">
        Key
        <input name="key" type="text" value={key} onChange={this.keyChangeHandler} />
        Value
        <input name="value" type="text" value={value} onChange={this.valueChangeHandler} />
        <button type="submit" onClick={this.submitHandler}>
          Submit
        </button>
      </form>
    );
  }
}
