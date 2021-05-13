/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RouteUsageMetric {
    call_count: number;
    error_count: number;
}

// TODO: use ES for this recording
class UsageRecorder {
    private counts = new Map<string, number>()
    public incrementCallCount(route: string, increment: number = 1) {
        const count = this.counts.get(route) ?? 0
        this.counts.set(route, count + increment)
    }
    public getCallCount(route: string): number {
        return this.counts.get(route) ?? 0;
    }

    private errors = new Map<string, number>()
    public incrementErrorCount(route: string, increment: number = 1) {
        const count = this.errors.get(route) ?? 0
        this.errors.set(route, count + increment)
    }
    public getErrorCount(route: string): number {
        return this.errors.get(route) ?? 0;
    }

    public getRouteMetric(route: string): RouteUsageMetric {
        return {
            call_count: this.getCallCount(route),
            error_count: this.getErrorCount(route)
        }
    }
}

let usageRecorder: UsageRecorder;

export const getUsageRecorder = (): UsageRecorder => {
    if (usageRecorder == null) {
        usageRecorder = new UsageRecorder()
    }
    return usageRecorder
}