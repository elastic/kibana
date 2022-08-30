/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import beeImage from './elastic_elk_b.png';

function Bee() {
  const [position, setPosition] = useState({
    top: 50 + Math.random() * 100,
    left: 50 + Math.random() * 50,
    vX: 3 + Math.random(),
    vY: 0.5 + Math.random() * 0.5,
  });

  useEffect(() => {
    let handle: number = 0;
    function tick() {
      handle = requestAnimationFrame(() => {
        setPosition(({ top, left, vX, vY }) => {
          let newVx = vX + Math.random() * 0.5 - 0.25;
          let newVy = vY + Math.random() - 0.5;
          if (top < 50) {
            newVy = Math.abs(newVy);
          }
          if (top > window.innerHeight - 300) {
            newVy = -1 * Math.abs(newVy);
          }
          if (left < 50) {
            newVx = Math.abs(newVx);
          }
          if (left > window.innerWidth - 300) {
            newVx = -1 * Math.abs(newVx);
          }

          return {
            top: top + vY,
            left: left + vX,
            vX: newVx,
            vY: newVy,
          };
        });
        tick();
      });
    }
    tick();
    return () => {
      cancelAnimationFrame(handle);
    };
  }, []);

  return (
    <img
      src={beeImage}
      alt="ELK-Bee"
      title="Bzzzzzzz"
      style={{
        position: 'absolute',
        width: '80px',
        height: 'auto',
        transform: position.vX > 0 ? 'scale(-1, 1)' : undefined,
        top: position.top,
        left: position.left,
        zIndex: 999,
      }}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default Bee;
