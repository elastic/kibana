# Resolver 7.9 performance tuning

## Steps I Took

1. First I reviewed the `process_event_dot` and `map` code and found likely candidates for perf issues. I marked these with comments.
4. Next I did a series of baseline tests (described in this document.)

## Baseline test setup

These steps were at least once at the start of testing. At one point I restarted chrome and redid some of these. If you want to take things very seriously, you should restart chrome after each test.

1. Run the generator with `yarn test:generate -d --maxCh --pt 90 --pr 100 --relAlerts 0 --ch 4 --gen 4 --anc 200 --relatedEvents 100`
2. Use `htop` to make sure the cpu load is low (<2 for my 6 core box)
3. Close all UI apps except chrome and close all terminal apps except kibana and ES. I also disabled spotlight during this time because it's awful and i hate it.
4. Close all chrome tabs except kibana
5. Set the kibana filter to `event.kind: "alert"`
6. Open the 'Event' list
7. Open chrome dev tools in its own window.
8. Set the size of the Chrome window to 1720x1338
  - I used Bettersnaptool to make the Chrome window take up the left half of my 4k display. I made the dev tools take up the right half. Using Chrome dev tools I measured the window size at 1720x1338.
9.  Use the 'full screen' button in the SIEM app. This makes the resolver large and a consistent size. Also there is no way to scroll so that's out of the equation.

## Baseline Tests
I use these to figure out how slow where are and what we should do to fix it. Later on, I'll compare these results to the final results to see if my perf improvements worked. Note that I performed the setup steps above before doing these tests.

After each test, I saved the performance profile from Chrome. This way I can refer to the exact details later on. These are large so I won't upload them unless someone asks for them.

### `baseline_test_1`

This is designed to see how a single loading resolver works, and how a single panning operation works.

1. Make sure no resolver query string values are present
1. Clear memory
1. Start recording. 
1. Open Resolver
1. Wait until the panel shows all process nodes
1. Drag map up and to the left, about as far as you can in one drag operation. Let go.
1. Wait about a second
1. Drag map back down to the center.
1. Wait about a second
1. Close Resolver
1. Stop recording

#### Notes
* `StyledPanel` takes 399ms for its initial render
* FPS during panning is in the 10-20 range
* `StyledActionsContainer` is the slowest component that's rerendered during panning
* A lot of memory alloc during panning

### `baseline_test_2`

This test is designed to see how Resolver handles manual zoom adjustments.

1. Make sure no resolver query string values are present
1. Clear memory
1. Start recording. 
1. Open Resolver
1. Wait until the panel shows all process nodes
1. Zoom all the way out using the mousewheel (by moving the mouse wheel towards the screen)
1. Wait about a second
1. Zoom all the way in using the mousewheel
1. Wait about a second
1. Zoom all the way out using the mousewheel (by moving the mouse wheel towards the screen)
1. Wait about a second
1. Zoom all the way in using the mousewheel
1. Wait about a second
1. Close Resolver
1. Stop recording

#### Notes
* FPS is extremely slow: about 3 fps
* The main process node buttons are animating their max-height the entire time.

### `baseline_test_3`

This test is designed to see how resolver handles camera panning animations at the min and max zoom levels.

1. Make sure no resolver query string values are present
1. Clear memory
1. Start recording. 
1. Open Resolver
1. Wait until the panel shows all process nodes
1. Zoom all the way out
1. Click first node in the process list (which will cause the camera to pan to it.)
1. Click last node in list
1. Zoom all the way in
1. Click the first node on the process list
1. Click the last node on the process list
1. Wait about a second
1. Close Resolver
1. Stop recording

#### Notes
* FPS is erratic 
* Too many animations happen to get a good idea of the next worst issue.
* EuiButton is again the culprit with animations. Also this time, a div with an ID which wraps the `button` is animation its `height` as well.

### `baseline_test_4`

This test is designed to see how Resolver handles continuous panning. I'm looking for unbounded memory allocation and the like.

1. Make sure no resolver query string values are present
1. Clear memory
1. Start recording. 
1. Open Resolver
1. Wait until the panel shows all process nodes
1. Pan wildly for 15 seconds.
1. Wait about a second
1. Close Resolver
1. Stop recording

#### Notes
* Too much animiation as in other tests.
* `StyledActionsContainer` is slow, is in other tests.
* FPS stablized in the low teens. This is probably the best overall metric for our rendering performance.

### `baseline_test_5`

This test is designed to see how Resolver handles continuously adjusting the zoom level.

1. Make sure no resolver query string values are present
1. Clear memory
1. Start recording. 
1. Open Resolver
1. Wait until the panel shows all process nodes
1. Change zoom wildly for 15 seconds
1. Wait about a second
1. Close Resolver
1. Stop recording

#### Notes
* FPS was around 2 on average during the zooming period.
* Felt very slow
* Lots of animation happening the entire time

### `baseline_test_6`

This tests how each panel renders.

1. Make sure no resolver query string values are present
1. Clear memory
1. Start recording. 
1. Open Resolver
1. Wait until the panel shows all process nodes
1. Click the name of a process node (at the time of this test, this will show its list of events.)
1. Select a category of its events via breadcrumbs or via the dropdown
1. Select a particular event (to see its details)
1. Select 'events' (which shows all process nodes)

#### Notes
* `ProcessListWithCounts` is very slow
* Rendering is slow due to animations, as in other tests.
