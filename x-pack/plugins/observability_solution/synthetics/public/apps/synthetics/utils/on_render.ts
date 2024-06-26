let renderCount = 0;
export function onRender(
  id: any,
  phase: any,
  actualDuration: any,
  baseDuration: any,
  startTime: any,
  commitTime: any,
  interactions: any
) {
  console.log('onRender', `count: ${renderCount++}`, {
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions,
  });
}
