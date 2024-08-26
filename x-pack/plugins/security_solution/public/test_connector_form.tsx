/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';


const Form = ({ editAction, actionParams, index }) => {


  return (
    <div>
      <button
        onClick={() => {
          editAction('subAction', 'custom value', index);
          editAction('alerts', null, index);
          // editAction('other field', 'other custom value', index);
        }}
      >
        Save
      </button>
    </div>
  );
};

export default Form;
