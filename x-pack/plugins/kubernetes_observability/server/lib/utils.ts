/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Event = {
    note: string;
    reason: string;
    type: string;
    time: string;
  };

export function extractFieldValue<T>(maybeArray: T | T[] | undefined): T {
    return toArray(maybeArray)[0];
}

function toArray<T>(maybeArray: T | T[] | undefined): T[] {
    if (!maybeArray) {
      return [];
    }
    if (Array.isArray(maybeArray)) {
      return maybeArray;
    }
    return [maybeArray];
}

export function phaseToState(phase: number) {
    switch(phase) { 
        case 1: { 
           return "Pending"; 
        } 
        case 2: { 
            return "Running"; 
        } 
        case 3: { 
            return "Succeeded"; 
        }
        case 4: { 
            return "Failed"; 
        }
        case 5: { 
            return "Unknown"; 
        }  
        default: { 
            return "Unknown"; 
        } 
    } 
}