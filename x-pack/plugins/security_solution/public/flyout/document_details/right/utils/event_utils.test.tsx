/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEcsAllowedValue, getEcsAllowedValueDescription } from './event_utils';

describe('test isEcsAllowedValue', () => {
  it('should return if the value is an allowed value given by field name', () => {
    expect(isEcsAllowedValue('event.kind', 'event')).toBe(true);
    expect(isEcsAllowedValue('event.kind', 'not ecs')).toBe(false);
    expect(isEcsAllowedValue('event.category', 'not ecs')).toBe(false);
  });
});

describe('test getEcsAllowedValueDescription', () => {
  it('should return correct description based on field', () => {
    expect(getEcsAllowedValueDescription('event.kind', 'metric')).toBe(
      'This value is used to indicate that this event describes a numeric measurement taken at given point in time.\nExamples include CPU utilization, memory usage, or device temperature.\nMetric events are often collected on a predictable frequency, such as once every few seconds, or once a minute, but can also be used to describe ad-hoc numeric metric queries.'
    );
    expect(getEcsAllowedValueDescription('event.category', 'malware')).toBe(
      'Malware detection events and alerts. Use this category to visualize and analyze malware detections from EDR/EPP systems such as Elastic Endpoint Security, Symantec Endpoint Protection, Crowdstrike, and network IDS/IPS systems such as Suricata, or other sources of malware-related events such as Palo Alto Networks threat logs and Wildfire logs.'
    );

    expect(getEcsAllowedValueDescription('event.kind', 'not ecs')).toBe(
      'This field is not an ecs field, description is not available.'
    );
    expect(getEcsAllowedValueDescription('event.category', 'not ecs')).toBe(
      'This field is not an ecs field, description is not available.'
    );
  });
});
