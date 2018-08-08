/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from "react";
import { healthToColor } from '../../../../../services';
import {
  EuiHealth,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from "@elastic/eui";

const HEADERS = {
  health: "Health",
  status: "Status",
  primary: "Primaries",
  replica: "Replicas",
  documents: "Docs Count",
  documents_deleted: "Docs Deleted",
  size: "Storage Size",
  primary_size: "Primary Storage Size"
};

export class Summary extends React.PureComponent {
  buildRows() {
    const { index } = this.props;
    return Object.keys(HEADERS).map(fieldName => {
      const value = index[fieldName];
      const content =
        fieldName === "health" ? (
          <EuiHealth color={healthToColor(value)}>{value}</EuiHealth>
        ) : value;
      return [
        <EuiDescriptionListTitle key={fieldName}>
          <strong>{HEADERS[fieldName]}:</strong>
        </EuiDescriptionListTitle>,
        <EuiDescriptionListDescription key={fieldName + "_desc"}>
          {content}
        </EuiDescriptionListDescription>
      ];
    });
  }

  render() {
    return (
      <EuiDescriptionList type="column" align="center">
        {this.buildRows()}
      </EuiDescriptionList>
    );
  }
}
