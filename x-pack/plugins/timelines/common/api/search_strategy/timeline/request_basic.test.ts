import { timelineRequestBasicOptionsSchema } from './request_basic';
import { mockBaseTimelineRequest } from './mocks/base_timeline_request';


describe('request_basic', () => {
    it('should correctly parse the base timeline request schema', () => {
        expect(timelineRequestBasicOptionsSchema.parse(mockBaseTimelineRequest)).toEqual(mockBaseTimelineRequest);
    });

    it('should correctly parse the base timeline request schema and remove unknown fields', () => {
        const invalidTimelineRequest = {
            ...mockBaseTimelineRequest,
            iamnotallowed: 'butwhy?'
        }
        expect(timelineRequestBasicOptionsSchema.parse(invalidTimelineRequest)).toEqual(mockBaseTimelineRequest);
    });
})