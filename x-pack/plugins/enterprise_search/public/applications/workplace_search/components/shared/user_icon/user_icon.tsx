/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { User } from '../../../types';

import './user_icon.scss';

export const UserIcon: React.FC<User> = ({ name, pictureUrl, color, initials, email }) => (
  <div className="user-icon user-icon--small" style={{ backgroundColor: color }}>
    {pictureUrl ? (
      <img src={pictureUrl} className="avatar__image" alt={name || email} />
    ) : (
      <span className="avatar__text">{initials}</span>
    )}
  </div>
);
